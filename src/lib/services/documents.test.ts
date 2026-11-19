import { afterEach, describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors";
import { updateDocument } from "@/lib/services/documents";
import { createTestDb, seedAccessFixture } from "@/lib/test/db";

describe("updateDocument optimistic concurrency", () => {
  let close: (() => void) | undefined;

  afterEach(() => {
    close?.();
    close = undefined;
  });

  it("returns 409 conflict when baseVersion does not match", async () => {
    const testDb = await createTestDb();
    close = testDb.close;
    await seedAccessFixture(testDb.db);

    // First save succeeds and bumps version to 2
    const first = await updateDocument(
      "u_alice",
      "doc_1",
      { contentHtml: "<p>v2</p>", baseVersion: 1 },
      testDb.db,
    );
    expect(first.version).toBe(2);

    // Stale baseVersion should conflict
    await expect(
      updateDocument(
        "u_bob",
        "doc_1",
        { contentHtml: "<p>stale</p>", baseVersion: 1 },
        testDb.db,
      ),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      extra: { version: 2 },
    } satisfies Partial<AppError>);
  });
});
