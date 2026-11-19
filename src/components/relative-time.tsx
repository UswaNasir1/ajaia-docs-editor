"use client";

import { useEffect, useState } from "react";
import { formatRelativeTime } from "@/lib/format";

type RelativeTimeProps = {
  iso: string;
  /** Prefix shown before the relative label, e.g. "Edited ". */
  prefix?: string;
};

/**
 * Relative labels use Date.now(), so they must not SSR — server/client clocks
 * disagree and React reports a hydration mismatch (often blamed on a parent).
 */
export function RelativeTime({ iso, prefix = "" }: RelativeTimeProps) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => setLabel(formatRelativeTime(iso));
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [iso]);

  if (!label) {
    // Stable SSR/client first paint — avoid Date.now() until mount.
    return <span>{prefix}…</span>;
  }

  return (
    <span>
      {prefix}
      {label}
    </span>
  );
}
