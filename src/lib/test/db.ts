import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { migrate } from "drizzle-orm/libsql/migrator";
import { createDb, type Db } from "@/lib/db/client";
import { documentShares, documents, users } from "@/lib/db/schema";

export async function createTestDb(): Promise<{
  db: Db;
  close: () => void;
  dir: string;
}> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ajaia-test-"));
  const url = `file:${path.join(dir, "test.db")}`;
  const { client, db } = createDb(url);
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });

  return {
    db,
    dir,
    close: () => {
      client.close();
      // Windows may keep the libSQL file locked briefly; ignore cleanup errors.
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch {
        // leave temp dir for OS cleanup
      }
    },
  };
}

export async function seedAccessFixture(db: Db) {
  await db.insert(users).values([
    {
      id: "u_alice",
      email: "alice@test",
      name: "Alice",
      passwordHash: "x",
    },
    {
      id: "u_bob",
      email: "bob@test",
      name: "Bob",
      passwordHash: "x",
    },
    {
      id: "u_carol",
      email: "carol@test",
      name: "Carol",
      passwordHash: "x",
    },
    {
      id: "u_dave",
      email: "dave@test",
      name: "Dave",
      passwordHash: "x",
    },
  ]);

  await db.insert(documents).values({
    id: "doc_1",
    ownerId: "u_alice",
    title: "Shared doc",
    contentHtml: "<p>hello</p>",
    version: 1,
  });

  await db.insert(documentShares).values([
    {
      documentId: "doc_1",
      userId: "u_bob",
      role: "editor",
    },
    {
      documentId: "doc_1",
      userId: "u_carol",
      role: "viewer",
    },
  ]);
}

/** Matches the product seed titles/shares used for list regression tests. */
export async function seedDemoListsFixture(db: Db) {
  await db.insert(users).values([
    {
      id: "user_alice",
      email: "alice@ajaia.test",
      name: "Alice",
      passwordHash: "x",
    },
    {
      id: "user_bob",
      email: "bob@ajaia.test",
      name: "Bob",
      passwordHash: "x",
    },
    {
      id: "user_carol",
      email: "carol@ajaia.test",
      name: "Carol",
      passwordHash: "x",
    },
  ]);

  await db.insert(documents).values([
    {
      id: "doc_welcome",
      ownerId: "user_alice",
      title: "Welcome to Ajaia Docs",
      contentHtml: "<p>welcome</p>",
      version: 1,
    },
    {
      id: "doc_alice_notes",
      ownerId: "user_alice",
      title: "Alice private notes",
      contentHtml: "<p>notes</p>",
      version: 1,
    },
    {
      id: "doc_bob_checklist",
      ownerId: "user_bob",
      title: "Bob's launch checklist",
      contentHtml: "<p>checklist</p>",
      version: 1,
    },
  ]);

  await db.insert(documentShares).values([
    {
      documentId: "doc_welcome",
      userId: "user_bob",
      role: "editor",
    },
    {
      documentId: "doc_welcome",
      userId: "user_carol",
      role: "viewer",
    },
    {
      documentId: "doc_bob_checklist",
      userId: "user_alice",
      role: "editor",
    },
  ]);
}
