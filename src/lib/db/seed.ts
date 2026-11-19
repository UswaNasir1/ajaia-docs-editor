import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { hash } from "bcryptjs";
import { createDb } from "./client";
import { documentShares, documents, users } from "./schema";

const DEMO_PASSWORD = "demo1234";

const WELCOME_HTML = `
<h1>Welcome to Ajaia Docs</h1>
<p>This is a sample collaborative document with <strong>bold</strong>, <em>italic</em>, and <u>underline</u> formatting.</p>
<h2>What you can try</h2>
<ul>
  <li>Sign in as different demo users</li>
  <li>Edit documents you own or can edit</li>
  <li>Share with viewer or editor roles</li>
</ul>
<ol>
  <li>Open a document from the dashboard</li>
  <li>Change the title and content</li>
  <li>Refresh — your changes should persist</li>
</ol>
<h2>How to review this app</h2>
<p>Log in as <strong>Alice</strong> to own and share docs, <strong>Bob</strong> to edit shared content, and <strong>Carol</strong> to experience read-only access.</p>
`.trim();

const ALICE_NOTES_HTML = `
<h1>Alice private notes</h1>
<p>Personal scratchpad — not shared with anyone.</p>
<ul>
  <li>Ship the walking skeleton early</li>
  <li>Keep scope tight</li>
</ul>
`.trim();

const BOB_CHECKLIST_HTML = `
<h1>Bob's launch checklist</h1>
<ol>
  <li>Confirm auth works for all demo users</li>
  <li>Verify sharing roles</li>
  <li>Double-check deployment env vars</li>
</ol>
<p>Shared with Alice as <em>editor</em>.</p>
`.trim();

async function upsertUser(
  db: ReturnType<typeof createDb>["db"],
  user: { id: string; email: string; name: string; passwordHash: string },
) {
  const existing = await db.query.users.findFirst({
    where: eq(users.email, user.email),
  });
  if (existing) {
    await db
      .update(users)
      .set({ name: user.name, passwordHash: user.passwordHash })
      .where(eq(users.id, existing.id));
    return existing.id;
  }
  await db.insert(users).values(user);
  return user.id;
}

async function upsertDocument(
  db: ReturnType<typeof createDb>["db"],
  doc: {
    id: string;
    ownerId: string;
    title: string;
    contentHtml: string;
  },
) {
  const existing = await db.query.documents.findFirst({
    where: and(eq(documents.ownerId, doc.ownerId), eq(documents.title, doc.title)),
  });
  if (existing) {
    await db
      .update(documents)
      .set({ contentHtml: doc.contentHtml, updatedAt: new Date().toISOString() })
      .where(eq(documents.id, existing.id));
    return existing.id;
  }
  await db.insert(documents).values({
    ...doc,
    version: 1,
  });
  return doc.id;
}

async function upsertShare(
  db: ReturnType<typeof createDb>["db"],
  share: {
    documentId: string;
    userId: string;
    role: "viewer" | "editor";
  },
) {
  const existing = await db.query.documentShares.findFirst({
    where: and(
      eq(documentShares.documentId, share.documentId),
      eq(documentShares.userId, share.userId),
    ),
  });
  if (existing) {
    await db
      .update(documentShares)
      .set({ role: share.role })
      .where(
        and(
          eq(documentShares.documentId, share.documentId),
          eq(documentShares.userId, share.userId),
        ),
      );
    return;
  }
  await db.insert(documentShares).values(share);
}

async function main() {
  const url = process.env.DATABASE_URL ?? "file:./data/local.db";
  const { client, db } = createDb(url, process.env.DATABASE_AUTH_TOKEN);
  const passwordHash = await hash(DEMO_PASSWORD, 10);

  console.log(`Seeding database: ${url}`);

  const aliceId = await upsertUser(db, {
    id: "user_alice",
    email: "alice@ajaia.test",
    name: "Alice",
    passwordHash,
  });
  const bobId = await upsertUser(db, {
    id: "user_bob",
    email: "bob@ajaia.test",
    name: "Bob",
    passwordHash,
  });
  const carolId = await upsertUser(db, {
    id: "user_carol",
    email: "carol@ajaia.test",
    name: "Carol",
    passwordHash,
  });

  const welcomeId = await upsertDocument(db, {
    id: "doc_welcome",
    ownerId: aliceId,
    title: "Welcome to Ajaia Docs",
    contentHtml: WELCOME_HTML,
  });
  await upsertDocument(db, {
    id: "doc_alice_notes",
    ownerId: aliceId,
    title: "Alice private notes",
    contentHtml: ALICE_NOTES_HTML,
  });
  const bobChecklistId = await upsertDocument(db, {
    id: "doc_bob_checklist",
    ownerId: bobId,
    title: "Bob's launch checklist",
    contentHtml: BOB_CHECKLIST_HTML,
  });

  await upsertShare(db, {
    documentId: welcomeId,
    userId: bobId,
    role: "editor",
  });
  await upsertShare(db, {
    documentId: welcomeId,
    userId: carolId,
    role: "viewer",
  });
  await upsertShare(db, {
    documentId: bobChecklistId,
    userId: aliceId,
    role: "editor",
  });

  client.close();
  console.log("Seed complete.");
  console.log("Demo password for all users: demo1234");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
