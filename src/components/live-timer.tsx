"use client";

import { useEffect, useState } from "react";

/** Cronómetro que cuenta desde "since" (más "baseMs" ya acumulados). */
export function LiveTimer({ since, baseMs = 0 }: { since: string; baseMs?: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const total = Math.max(0, Math.floor((baseMs + now - new Date(since).getTime()) / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <span suppressHydrationWarning className="tabular-nums">
      {pad(Math.floor(total / 3600))}:{pad(Math.floor((total % 3600) / 60))}:{pad(total % 60)}
    </span>
  );
}
