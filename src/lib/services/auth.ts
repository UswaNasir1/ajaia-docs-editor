import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import type { SessionUser } from "@/lib/auth/session";

/** Dummy bcrypt hash so unknown emails still pay compare cost (same error either way). */
const DUMMY_PASSWORD_HASH =
  "$2b$10$nQat1lvtDZhT.kxSoqlmPuwfqzqLeqZ0uPTAJD2bESn5PDfwGgDB.";

export async function authenticateUser(
  email: string,
  password: string,
): Promise<SessionUser | null> {
  const db = getDb();
  const user = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  });

  const hash = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
  const valid = await compare(password, hash);
  if (!user || !valid) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
}
