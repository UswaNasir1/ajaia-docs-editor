/** Always bypass browser/HTTP caches for live document data. */
export const noStoreFetch: RequestInit = {
  cache: "no-store",
};

export const POLL_INTERVAL_MS = 15_000;
