"use client";

import { useEffect } from "react";
import { POLL_INTERVAL_MS } from "@/lib/fetch";

/**
 * Calls `onPoll` when the tab becomes visible/focused, and every `intervalMs`
 * while visible. Pauses while the tab is hidden. Does not poll on mount.
 */
export function useVisibilityPolling(
  onPoll: () => void,
  intervalMs: number = POLL_INTERVAL_MS,
) {
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const clear = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    const start = () => {
      if (timer || document.visibilityState !== "visible") return;
      timer = setInterval(() => {
        if (document.visibilityState === "visible") {
          onPoll();
        }
      }, intervalMs);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        onPoll();
        start();
      } else {
        clear();
      }
    };

    const onFocus = () => {
      if (document.visibilityState === "visible") {
        onPoll();
      }
    };

    if (document.visibilityState === "visible") {
      start();
    }
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);

    return () => {
      clear();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
    };
  }, [onPoll, intervalMs]);
}
