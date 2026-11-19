import { and, eq } from "drizzle-orm";
import { getDb, type Db } from "@/lib/db/client";
import { documentShares, documents } from "@/lib/db/schema";

export type AccessRole = "owner" | "editor" | "viewer" | "none";

export async function getAccess(
  userId: string,
  docId: string,
  db: Db = getDb(),
): Promise<AccessRole> {
  const doc = await db.query.documents.findFirst({
    where: eq(documents.id, docId),
    columns: { ownerId: true },
  });
  if (!doc) return "none";
  if (doc.ownerId === userId) return "owner";

  const share = await db.query.documentShares.findFirst({
    where: and(
      eq(documentShares.documentId, docId),
      eq(documentShares.userId, userId),
    ),
    columns: { role: true },
  });
  if (!share) return "none";
  return share.role;
}

export function canRead(role: AccessRole) {
  return role === "owner" || role === "editor" || role === "viewer";
}

export function canEdit(role: AccessRole) {
  return role === "owner" || role === "editor";
}

export function canManageShares(role: AccessRole) {
  return role === "owner";
}

export function canDelete(role: AccessRole) {
  return role === "owner";
}
