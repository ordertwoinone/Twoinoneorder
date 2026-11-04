"use client";

import { useEffect, useState } from "react";
import { Timer } from "lucide-react";

/** How long an order can wait before its timer turns red. */
export const LATE_AFTER_MS = 20 * 60_000;

/**
 * One second hand for a whole screen of orders, ticking only while somebody is
 * looking, so a tablet left on overnight isn't redrawing clocks nobody reads.
 */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    const onVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        setNow(Date.now());
        if (!timer) timer = setInterval(() => setNow(Date.now()), 1000);
      }
    };
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
  return now;
}

/**
 * Time since the order came in. Counts while the kitchen has it, then freezes
 * when it is ready, because a finished order whose clock keeps climbing reads as
 * a problem that is still running.
 */
export default function OrderTimer({
  from, readyAt, servedAt, status, now,
}: {
  from: string;
  readyAt?: string | null;
  servedAt?: string | null;
  status: string;
  now: number;
}) {
  const running = status === "new" || status === "preparing";
  // Orders from before the Ready step only have the served time.
  const endedAt = status === "ready" || status === "served" ? readyAt ?? servedAt : null;
  const frozen = !running && Boolean(endedAt);

  if (!running && !frozen) {
    return (
      <span className="inline-flex items-center gap-1.5 text-gray-400">
        <Timer size={16} />
        <span className="text-sm font-semibold">—</span>
      </span>
    );
  }

  const ms = Math.max(0, (frozen ? new Date(endedAt as string).getTime() : now) - new Date(from).getTime());
  const clock = formatClock(ms);
  const tone = frozen ? "text-gray-500" : ms >= LATE_AFTER_MS ? "text-red-600" : "text-green-700";

  return (
    <span className="inline-flex items-center gap-1.5">
      <Timer size={16} className={frozen ? "text-gray-400" : "text-gray-700"} />
      <span className={`text-lg font-bold tabular-nums leading-none ${tone}`}>{clock}</span>
      <span className="text-[10px] font-medium text-gray-500">{frozen ? "prep time" : "min:sec"}</span>
    </span>
  );
}

export function formatClock(ms: number): string {
  const total = Math.floor(ms / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** Time the waiter has had a ready order: runs from ready until served, then freezes. */
export function WaiterTimer({
  readyAt, servedAt, now,
}: {
  readyAt: string;
  servedAt?: string | null;
  now: number;
}) {
  const end = servedAt ? new Date(servedAt).getTime() : now;
  const clock = formatClock(Math.max(0, end - new Date(readyAt).getTime()));

  if (servedAt) {
    return <span className="text-xs font-medium text-gray-500">Waiter took <span className="font-bold tabular-nums">{clock}</span></span>;
  }
  return (
    <span className="inline-flex items-center gap-2 rounded-lg bg-green-700 px-2.5 py-1 text-white shadow-sm">
      <Timer size={18} />
      <span className="text-xs font-semibold">Waiter</span>
      <span data-waiter-timer className="text-xl font-black tabular-nums leading-none">{clock}</span>
    </span>
  );
}
