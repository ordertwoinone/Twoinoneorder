import { AlertTriangle } from "lucide-react";
import type { StaleShift } from "@/lib/pos/shift";

/**
 * The banner for a day nobody closed.
 *
 * Carried on every till screen rather than shown once at login, because a
 * warning that can be dismissed is a warning that will be. It goes when the
 * shift is closed, and only then.
 */
export default function StaleShiftWarning({ shifts }: { shifts: StaleShift[] }) {
  if (shifts.length === 0) return null;

  return (
    <div
      className="pos-chrome flex items-start gap-3 px-5 py-2.5"
      style={{ background: "#FEF3C7", borderBottom: "1px solid #FDE68A" }}
    >
      <AlertTriangle size={17} className="mt-0.5 shrink-0" style={{ color: "#B45309" }} />
      <div className="min-w-0 text-[12.5px]" style={{ color: "#78350F" }}>
        <p className="font-bold">
          {shifts.length === 1
            ? "A shift was never closed"
            : `${shifts.length} shifts were never closed`}
        </p>
        <p className="mt-0.5">
          {shifts
            .map(
              (s) =>
                `${s.staff_name}'s ${s.shift_label.toLowerCase()} shift from ${new Date(
                  s.opened_at,
                ).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` +
                (s.days_old > 1 ? ` (${s.days_old} days ago)` : ""),
            )
            .join(" · ")}
          . Until a manager counts the drawer and closes it, that day&rsquo;s takings are not
          reconciled.
        </p>
      </div>
    </div>
  );
}
