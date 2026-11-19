import { describe, expect, it } from "vitest";
import { noStoreFetch, POLL_INTERVAL_MS } from "./fetch";

describe("live data fetch helpers", () => {
  it("uses no-store and a 15s poll interval for near-real-time updates", () => {
    expect(noStoreFetch.cache).toBe("no-store");
    expect(POLL_INTERVAL_MS).toBe(15_000);
  });
});
