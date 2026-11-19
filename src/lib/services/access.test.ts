import { afterEach, describe, expect, it } from "vitest";
import { getAccess } from "@/lib/services/access";
import { createTestDb, seedAccessFixture } from "@/lib/test/db";

describe("getAccess", () => {
  let close: (() => void) | undefined;

  afterEach(() => {
    close?.();
    close = undefined;
  });

  it("returns owner, editor, viewer, or none", async () => {
    const testDb = await createTestDb();
    close = testDb.close;
    await seedAccessFixture(testDb.db);

    await expect(getAccess("u_alice", "doc_1", testDb.db)).resolves.toBe(
      "owner",
    );
    await expect(getAccess("u_bob", "doc_1", testDb.db)).resolves.toBe(
      "editor",
    );
    await expect(getAccess("u_carol", "doc_1", testDb.db)).resolves.toBe(
      "viewer",
    );
    await expect(getAccess("u_dave", "doc_1", testDb.db)).resolves.toBe("none");
    await expect(getAccess("u_alice", "missing", testDb.db)).resolves.toBe(
      "none",
    );
  });
});
