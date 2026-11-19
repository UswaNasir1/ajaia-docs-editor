import { and, desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb, type Db } from "@/lib/db/client";
import { documentShares, documents, users } from "@/lib/db/schema";
import { AppError } from "@/lib/errors";
import { sanitizeContentHtml } from "@/lib/sanitize";
import {
  canDelete,
  canEdit,
  canRead,
  getAccess,
  type AccessRole,
} from "@/lib/services/access";
import { countSharesByDocument } from "@/lib/services/shares";

export const MAX_CONTENT_BYTES = 1_000_000;

export type DocSummary = {
  id: string;
  title: string;
  updatedAt: string;
  ownerName: string;
  role: Exclude<AccessRole, "none">;
  /** Present for owned docs: how many people the doc is shared with. */
  sharedWithCount?: number;
};

export type DocumentDetail = {
  id: string;
  title: string;
  contentHtml: string;
  version: number;
  updatedAt: string;
  createdAt: string;
  ownerName: string;
  role: Exclude<AccessRole, "none">;
};

function byteLength(value: string) {
  return Buffer.byteLength(value, "utf8");
}

function assertContentSize(html: string) {
  if (byteLength(html) > MAX_CONTENT_BYTES) {
    throw new AppError("PAYLOAD_TOO_LARGE", "Document content exceeds 1 MB limit");
  }
}

export async function listDocuments(
  userId: string,
  db: Db = getDb(),
): Promise<{ owned: DocSummary[]; shared: DocSummary[] }> {
  const ownedRows = await db
    .select({
      id: documents.id,
      title: documents.title,
      updatedAt: documents.updatedAt,
      ownerName: users.name,
    })
    .from(documents)
    .innerJoin(users, eq(documents.ownerId, users.id))
    .where(eq(documents.ownerId, userId))
    .orderBy(desc(documents.updatedAt));

  const sharedRows = await db.query.documentShares.findMany({
    where: eq(documentShares.userId, userId),
    with: {
      document: {
        with: {
          owner: true,
        },
      },
    },
  });

  const shareCounts = await countSharesByDocument(
    ownedRows.map((row) => row.id),
    db,
  );

  const owned: DocSummary[] = ownedRows.map((row) => ({
    id: row.id,
    title: row.title,
    updatedAt: row.updatedAt,
    ownerName: row.ownerName,
    role: "owner" as const,
    sharedWithCount: shareCounts.get(row.id) ?? 0,
  }));

  const shared: DocSummary[] = sharedRows
    .filter((row) => row.document.ownerId !== userId)
    .map((row) => ({
      id: row.document.id,
      title: row.document.title,
      updatedAt: row.document.updatedAt,
      ownerName: row.document.owner.name,
      role: row.role,
    }))
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

  return { owned, shared };
}

export async function createDocument(
  userId: string,
  title = "Untitled document",
  db: Db = getDb(),
): Promise<DocumentDetail> {
  const trimmed = title.trim() || "Untitled document";
  if (trimmed.length < 1 || trimmed.length > 120) {
    throw new AppError("BAD_REQUEST", "Title must be 1–120 characters");
  }

  const id = randomUUID();
  const now = new Date().toISOString();
  await db.insert(documents).values({
    id,
    ownerId: userId,
    title: trimmed,
    contentHtml: "",
    version: 1,
    createdAt: now,
    updatedAt: now,
  });

  const owner = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { name: true },
  });

  return {
    id,
    title: trimmed,
    contentHtml: "",
    version: 1,
    updatedAt: now,
    createdAt: now,
    ownerName: owner?.name ?? "Unknown",
    role: "owner",
  };
}

export async function getDocument(
  userId: string,
  docId: string,
  db: Db = getDb(),
): Promise<DocumentDetail | null> {
  const role = await getAccess(userId, docId, db);
  if (!canRead(role)) return null;

  const row = await db.query.documents.findFirst({
    where: eq(documents.id, docId),
    with: { owner: true },
  });
  if (!row) return null;

  return {
    id: row.id,
    title: row.title,
    contentHtml: row.contentHtml,
    version: row.version,
    updatedAt: row.updatedAt,
    createdAt: row.createdAt,
    ownerName: row.owner.name,
    role: role as Exclude<AccessRole, "none">,
  };
}

export async function updateDocument(
  userId: string,
  docId: string,
  input: { title?: string; contentHtml?: string; baseVersion: number },
  db: Db = getDb(),
): Promise<DocumentDetail> {
  const role = await getAccess(userId, docId, db);
  if (role === "none") {
    throw new AppError("NOT_FOUND", "Document not found");
  }
  if (!canEdit(role)) {
    throw new AppError("FORBIDDEN", "You do not have permission to edit this document");
  }

  const current = await db.query.documents.findFirst({
    where: eq(documents.id, docId),
    with: { owner: true },
  });
  if (!current) {
    throw new AppError("NOT_FOUND", "Document not found");
  }

  if (input.baseVersion !== current.version) {
    throw new AppError("CONFLICT", "Document was updated by someone else", {
      version: current.version,
    });
  }

  const patch: {
    title?: string;
    contentHtml?: string;
    version: number;
    updatedAt: string;
  } = {
    version: current.version + 1,
    updatedAt: new Date().toISOString(),
  };

  if (input.title !== undefined) {
    const title = input.title.trim();
    if (title.length < 1 || title.length > 120) {
      throw new AppError("BAD_REQUEST", "Title must be 1–120 characters");
    }
    patch.title = title;
  }

  if (input.contentHtml !== undefined) {
    const sanitized = sanitizeContentHtml(input.contentHtml);
    assertContentSize(sanitized);
    patch.contentHtml = sanitized;
  }

  await db
    .update(documents)
    .set(patch)
    .where(and(eq(documents.id, docId), eq(documents.version, current.version)));

  // Re-check in case of a race that slipped past baseVersion
  const updated = await db.query.documents.findFirst({
    where: eq(documents.id, docId),
    with: { owner: true },
  });
  if (!updated || updated.version !== patch.version) {
    throw new AppError("CONFLICT", "Document was updated by someone else", {
      version: updated?.version ?? current.version,
    });
  }

  return {
    id: updated.id,
    title: updated.title,
    contentHtml: updated.contentHtml,
    version: updated.version,
    updatedAt: updated.updatedAt,
    createdAt: updated.createdAt,
    ownerName: updated.owner.name,
    role: role as Exclude<AccessRole, "none">,
  };
}

export async function deleteDocument(
  userId: string,
  docId: string,
  db: Db = getDb(),
): Promise<void> {
  const role = await getAccess(userId, docId, db);
  if (role === "none") {
    throw new AppError("NOT_FOUND", "Document not found");
  }
  if (!canDelete(role)) {
    throw new AppError("FORBIDDEN", "Only the owner can delete this document");
  }

  await db.delete(documents).where(eq(documents.id, docId));
}

/** Test helper: set version without going through updateDocument auth. */
export async function forceSetVersion(
  docId: string,
  version: number,
  db: Db = getDb(),
) {
  await db
    .update(documents)
    .set({ version, updatedAt: new Date().toISOString() })
    .where(eq(documents.id, docId));
}
