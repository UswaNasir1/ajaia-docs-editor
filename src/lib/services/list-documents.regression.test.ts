import { afterEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { documentShares } from "@/lib/db/schema";
import { listDocuments } from "@/lib/services/documents";
import { addOrUpdateShare, removeShare } from "@/lib/services/shares";
import { createTestDb, seedDemoListsFixture } from "@/lib/test/db";

function titles(docs: { title: string }[]) {
  return docs.map((d) => d.title).sort();
}

function assertNoOverlap(
  owned: { id: string }[],
  shared: { id: string }[],
) {
  const ownedIds = new Set(owned.map((d) => d.id));
  for (const doc of shared) {
    expect(ownedIds.has(doc.id)).toBe(false);
  }
}

describe("listDocuments seed regression", () => {
  let close: (() => void) | undefined;

  afterEach(() => {
    close?.();
    close = undefined;
  });

  it("returns exact owned/shared titles per seeded user", async () => {
    const testDb = await createTestDb();
    close = testDb.close;
    await seedDemoListsFixture(testDb.db);

    const alice = await listDocuments("user_alice", testDb.db);
    const bob = await listDocuments("user_bob", testDb.db);
    const carol = await listDocuments("user_carol", testDb.db);

    expect(titles(alice.owned)).toEqual(
      titles([
        { title: "Welcome to Ajaia Docs" },
        { title: "Alice private notes" },
      ]),
    );
    expect(titles(alice.shared)).toEqual(["Bob's launch checklist"]);
    assertNoOverlap(alice.owned, alice.shared);

    expect(titles(bob.owned)).toEqual(["Bob's launch checklist"]);
    expect(titles(bob.shared)).toEqual(["Welcome to Ajaia Docs"]);
    assertNoOverlap(bob.owned, bob.shared);

    expect(titles(carol.owned)).toEqual([]);
    expect(titles(carol.shared)).toEqual(["Welcome to Ajaia Docs"]);
    assertNoOverlap(carol.owned, carol.shared);

    // Alice shares private notes with Carol
    await addOrUpdateShare(
      "user_alice",
      "doc_alice_notes",
      { email: "carol@ajaia.test", role: "viewer" },
      testDb.db,
    );

    const carolAfterShare = await listDocuments("user_carol", testDb.db);
    const aliceAfterShare = await listDocuments("user_alice", testDb.db);
    expect(titles(carolAfterShare.shared)).toEqual(
      titles([
        { title: "Welcome to Ajaia Docs" },
        { title: "Alice private notes" },
      ]),
    );
    expect(titles(aliceAfterShare.owned)).toEqual(
      titles([
        { title: "Welcome to Ajaia Docs" },
        { title: "Alice private notes" },
      ]),
    );
    assertNoOverlap(aliceAfterShare.owned, aliceAfterShare.shared);

    // Remove share — Carol no longer sees private notes
    await removeShare(
      "user_alice",
      "doc_alice_notes",
      "user_carol",
      testDb.db,
    );
    const carolAfterRevoke = await listDocuments("user_carol", testDb.db);
    expect(titles(carolAfterRevoke.shared)).toEqual(["Welcome to Ajaia Docs"]);
    expect(
      carolAfterRevoke.shared.find((d) => d.title === "Alice private notes"),
    ).toBeUndefined();

    const leftover = await testDb.db.query.documentShares.findFirst({
      where: and(
        eq(documentShares.documentId, "doc_alice_notes"),
        eq(documentShares.userId, "user_carol"),
      ),
    });
    expect(leftover).toBeUndefined();
  });
});

