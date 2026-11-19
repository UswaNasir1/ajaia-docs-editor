import { afterEach, describe, expect, it } from "vitest";
import { documentShares, documents } from "@/lib/db/schema";
import { listDocuments } from "@/lib/services/documents";
import { createTestDb, seedAccessFixture } from "@/lib/test/db";

describe("listDocuments isolation", () => {
  let close: (() => void) | undefined;

  afterEach(() => {
    close?.();
    close = undefined;
  });

  it("only lists docs the user owns or that are shared with them, with correct owners", async () => {
    const testDb = await createTestDb();
    close = testDb.close;
    await seedAccessFixture(testDb.db);

    // Carol-owned doc shared only with Bob — Alice must not see it
    await testDb.db.insert(documents).values({
      id: "doc_carol",
      ownerId: "u_carol",
      title: "Carol secret",
      contentHtml: "<p>secret</p>",
      version: 1,
    });
    await testDb.db.insert(documentShares).values({
      documentId: "doc_carol",
      userId: "u_bob",
      role: "editor",
    });

    const alice = await listDocuments("u_alice", testDb.db);
    const bob = await listDocuments("u_bob", testDb.db);
    const carol = await listDocuments("u_carol", testDb.db);

    expect(alice.owned.map((d) => d.id)).toEqual(["doc_1"]);
    expect(alice.owned[0]?.ownerName).toBe("Alice");
    expect(alice.shared.map((d) => d.id)).not.toContain("doc_carol");

    expect(bob.owned.map((d) => d.id)).toEqual([]);
    expect(bob.shared.map((d) => d.id).sort()).toEqual(["doc_1", "doc_carol"]);
    expect(bob.shared.find((d) => d.id === "doc_1")?.ownerName).toBe("Alice");
    expect(bob.shared.find((d) => d.id === "doc_carol")?.ownerName).toBe(
      "Carol",
    );

    expect(carol.owned.map((d) => d.id)).toEqual(["doc_carol"]);
    expect(carol.shared.map((d) => d.id)).toEqual(["doc_1"]);
    expect(carol.shared[0]?.ownerName).toBe("Alice");
    expect(alice.shared.map((d) => d.id)).not.toContain("doc_carol");
    expect(alice.owned.map((d) => d.id)).not.toContain("doc_carol");
  });
});

