import { afterEach, describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors";
import {
  canDelete,
  canEdit,
  canManageShares,
  canRead,
  getAccess,
} from "@/lib/services/access";
import {
  deleteDocument,
  getDocument,
  updateDocument,
} from "@/lib/services/documents";
import {
  addOrUpdateShare,
  listShares,
  removeShare,
  updateShareRole,
} from "@/lib/services/shares";
import { createTestDb, seedAccessFixture } from "@/lib/test/db";

describe("permission matrix", () => {
  let close: (() => void) | undefined;

  afterEach(() => {
    close?.();
    close = undefined;
  });

  it("maps owner/editor/viewer/none to read/edit/share/delete correctly", async () => {
    const testDb = await createTestDb();
    close = testDb.close;
    await seedAccessFixture(testDb.db);

    const roles = {
      owner: await getAccess("u_alice", "doc_1", testDb.db),
      editor: await getAccess("u_bob", "doc_1", testDb.db),
      viewer: await getAccess("u_carol", "doc_1", testDb.db),
      none: await getAccess("u_dave", "doc_1", testDb.db),
    };

    expect(roles).toEqual({
      owner: "owner",
      editor: "editor",
      viewer: "viewer",
      none: "none",
    });

    expect(canRead("owner")).toBe(true);
    expect(canRead("editor")).toBe(true);
    expect(canRead("viewer")).toBe(true);
    expect(canRead("none")).toBe(false);

    expect(canEdit("owner")).toBe(true);
    expect(canEdit("editor")).toBe(true);
    expect(canEdit("viewer")).toBe(false);
    expect(canEdit("none")).toBe(false);

    expect(canManageShares("owner")).toBe(true);
    expect(canManageShares("editor")).toBe(false);
    expect(canManageShares("viewer")).toBe(false);
    expect(canManageShares("none")).toBe(false);

    expect(canDelete("owner")).toBe(true);
    expect(canDelete("editor")).toBe(false);
    expect(canDelete("viewer")).toBe(false);
    expect(canDelete("none")).toBe(false);

    await expect(
      getDocument("u_dave", "doc_1", testDb.db),
    ).resolves.toBeNull();

    await expect(
      updateDocument(
        "u_carol",
        "doc_1",
        { contentHtml: "<p>nope</p>", baseVersion: 1 },
        testDb.db,
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" } satisfies Partial<AppError>);

    await expect(
      listShares("u_bob", "doc_1", testDb.db),
    ).rejects.toMatchObject({ code: "FORBIDDEN" } satisfies Partial<AppError>);

    await expect(
      listShares("u_dave", "doc_1", testDb.db),
    ).rejects.toMatchObject({ code: "NOT_FOUND" } satisfies Partial<AppError>);

    await expect(
      deleteDocument("u_bob", "doc_1", testDb.db),
    ).rejects.toMatchObject({ code: "FORBIDDEN" } satisfies Partial<AppError>);
  });
});

describe("share rules", () => {
  let close: (() => void) | undefined;

  afterEach(() => {
    close?.();
    close = undefined;
  });

  it("enforces self/unknown/duplicate upsert and revoke", async () => {
    const testDb = await createTestDb();
    close = testDb.close;
    await seedAccessFixture(testDb.db);

    await expect(
      addOrUpdateShare(
        "u_alice",
        "doc_1",
        { email: "alice@test", role: "viewer" },
        testDb.db,
      ),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" } satisfies Partial<AppError>);

    await expect(
      addOrUpdateShare(
        "u_alice",
        "doc_1",
        { email: "nobody@test", role: "viewer" },
        testDb.db,
      ),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "No user with that email",
    } satisfies Partial<AppError>);

    // Duplicate share updates role (bob is editor → viewer)
    const updated = await addOrUpdateShare(
      "u_alice",
      "doc_1",
      { email: "BOB@test", role: "viewer" },
      testDb.db,
    );
    expect(updated.role).toBe("viewer");
    await expect(getAccess("u_bob", "doc_1", testDb.db)).resolves.toBe(
      "viewer",
    );

    await updateShareRole("u_alice", "doc_1", "u_bob", "editor", testDb.db);
    await expect(getAccess("u_bob", "doc_1", testDb.db)).resolves.toBe(
      "editor",
    );

    await expect(
      addOrUpdateShare(
        "u_bob",
        "doc_1",
        { email: "dave@test", role: "viewer" },
        testDb.db,
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" } satisfies Partial<AppError>);

    await removeShare("u_alice", "doc_1", "u_bob", testDb.db);
    await expect(getAccess("u_bob", "doc_1", testDb.db)).resolves.toBe("none");
    await expect(
      getDocument("u_bob", "doc_1", testDb.db),
    ).resolves.toBeNull();
  });
});
