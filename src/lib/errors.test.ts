import { describe, expect, it } from "vitest";
import { errorResponse } from "./errors";

describe("errorResponse", () => {
  it("returns consistent error JSON and status", async () => {
    const res = errorResponse("UNAUTHORIZED", "Invalid email or password");
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({
      error: { code: "UNAUTHORIZED", message: "Invalid email or password" },
    });
  });
});
