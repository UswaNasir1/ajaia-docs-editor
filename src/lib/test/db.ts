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
