import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb, type Db } from "@/lib/db/client";
import { documentShares, documents, users } from "@/lib/db/schema";
import { AppError } from "@/lib/errors";
import {
  canManageShares,
  getAccess,
  type AccessRole,
} from "@/lib/services/access";

export type ShareCollaborator = {
  userId: string;
  name: string;
  email: string;
  role: "viewer" | "editor" | "owner";
};

export type SharesResponse = {
  owner: ShareCollaborator;
  shares: ShareCollaborator[];
};

async function requireOwner(userId: string, docId: string, db: Db) {
  const role = await getAccess(userId, docId, db);
  if (role === "none") {
    throw new AppError("NOT_FOUND", "Document not found");
  }
  if (!canManageShares(role)) {
    throw new AppError("FORBIDDEN", "Only the owner can manage sharing");
  }
  return role;
}

export async function listShares(
  userId: string,
  docId: string,
  db: Db = getDb(),
): Promise<SharesResponse> {
  await requireOwner(userId, docId, db);

  const doc = await db.query.documents.findFirst({
    where: eq(documents.id, docId),
    with: { owner: true },
  });
  if (!doc) {
    throw new AppError("NOT_FOUND", "Document not found");
  }

  const rows = await db.query.documentShares.findMany({
    where: eq(documentShares.documentId, docId),
    with: { user: true },
  });

  return {
    owner: {
      userId: doc.owner.id,
      name: doc.owner.name,
      email: doc.owner.email,
      role: "owner",
    },
    shares: rows.map((row) => ({
      userId: row.user.id,
      name: row.user.name,
      email: row.user.email,
      role: row.role,
    })),
  };
}

export async function addOrUpdateShare(
  actorId: string,
  docId: string,
  input: { email: string; role: "viewer" | "editor" },
  db: Db = getDb(),
): Promise<ShareCollaborator> {
  await requireOwner(actorId, docId, db);

  const email = input.email.trim().toLowerCase();
  const target = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (!target) {
    throw new AppError("NOT_FOUND", "No user with that email");
  }

  const doc = await db.query.documents.findFirst({
    where: eq(documents.id, docId),
    columns: { ownerId: true },
  });
  if (!doc) {
    throw new AppError("NOT_FOUND", "Document not found");
  }

  if (target.id === doc.ownerId || target.id === actorId) {
    throw new AppError("BAD_REQUEST", "Cannot share a document with yourself");
  }

  const existing = await db.query.documentShares.findFirst({
    where: and(
      eq(documentShares.documentId, docId),
      eq(documentShares.userId, target.id),
    ),
  });

  if (existing) {
    await db
      .update(documentShares)
      .set({ role: input.role })
      .where(
        and(
          eq(documentShares.documentId, docId),
          eq(documentShares.userId, target.id),
        ),
      );
  } else {
    await db.insert(documentShares).values({
      documentId: docId,
      userId: target.id,
      role: input.role,
    });
  }

  return {
    userId: target.id,
    name: target.name,
    email: target.email,
    role: input.role,
  };
}

export async function updateShareRole(
  actorId: string,
  docId: string,
  targetUserId: string,
  role: "viewer" | "editor",
  db: Db = getDb(),
): Promise<ShareCollaborator> {
  await requireOwner(actorId, docId, db);

  const share = await db.query.documentShares.findFirst({
    where: and(
      eq(documentShares.documentId, docId),
      eq(documentShares.userId, targetUserId),
    ),
    with: { user: true },
  });
  if (!share) {
    throw new AppError("NOT_FOUND", "Share not found");
  }

  await db
    .update(documentShares)
    .set({ role })
    .where(
      and(
        eq(documentShares.documentId, docId),
        eq(documentShares.userId, targetUserId),
      ),
    );

  return {
    userId: share.user.id,
    name: share.user.name,
    email: share.user.email,
    role,
  };
}

export async function removeShare(
  actorId: string,
  docId: string,
  targetUserId: string,
  db: Db = getDb(),
): Promise<void> {
  await requireOwner(actorId, docId, db);

  const share = await db.query.documentShares.findFirst({
    where: and(
      eq(documentShares.documentId, docId),
      eq(documentShares.userId, targetUserId),
    ),
  });
  if (!share) {
    throw new AppError("NOT_FOUND", "Share not found");
  }

  await db
    .delete(documentShares)
    .where(
      and(
        eq(documentShares.documentId, docId),
        eq(documentShares.userId, targetUserId),
      ),
    );
}

export async function countSharesByDocument(
  documentIds: string[],
  db: Db = getDb(),
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (documentIds.length === 0) return counts;

  const rows = await db
    .select({
      documentId: documentShares.documentId,
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(documentShares)
    .where(inArray(documentShares.documentId, documentIds))
    .groupBy(documentShares.documentId);

  for (const row of rows) {
    counts.set(row.documentId, row.count);
  }
  return counts;
}

export type { AccessRole };
