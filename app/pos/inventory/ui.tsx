"use client";

import { X } from "lucide-react";
import { POS } from "@/lib/pos/theme";

/**
 * The small parts the stock screens share.
 *
 * Kept here rather than repeated per tab because the count sheet, the register
 * and the valuation are the same table three times over — and a stepper that
 * behaves differently on one of them is how a figure gets keyed in wrong.
 */

export function Stat({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
  tone?: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-3.5 flex items-center gap-3" style={{ border: `1px solid ${POS.line}` }}>
      {icon && (
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: POS.page, color: tone ?? POS.inkSoft }}
        >
          {icon}
        </span>
      )}
      <span className="min-w-0">
        <span className="block text-[11.5px]" style={{ color: POS.inkSoft }}>{label}</span>
        <span className="block text-lg font-black truncate" style={{ color: tone ?? POS.ink }}>{value}</span>
        {hint && <span className="block text-[10.5px] truncate" style={{ color: POS.inkSoft }}>{hint}</span>}
      </span>
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[11.5px] font-semibold" style={{ color: POS.inkSoft }}>{label}</p>
      {children}
      {hint && <p className="mt-1 text-[10.5px]" style={{ color: POS.inkSoft }}>{hint}</p>}
    </div>
  );
}

const controlStyle = { border: `1px solid ${POS.line}`, color: POS.ink } as const;

export function Text({
  value,
  onChange,
  placeholder,
  numeric,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  numeric?: boolean;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(numeric ? e.target.value.replace(/[^0-9.]/g, "") : e.target.value)}
      inputMode={numeric ? "decimal" : undefined}
      placeholder={placeholder}
      className="w-full rounded-lg bg-white px-3 py-2.5 text-[13px] focus:outline-none"
      style={controlStyle}
    />
  );
}

export function Select({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[] | { value: string; label: string }[];
  placeholder?: string;
}) {
  const normalised = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg bg-white px-3 py-2.5 text-[13px] focus:outline-none"
      style={controlStyle}
    >
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {normalised.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

/**
 * A quantity cell: minus, a typed figure, plus.
 *
 * Both ways in on purpose. A delivery of twenty-four cases is typed; the one
 * bottle that broke on the way to the fridge is a single tap, and making
 * somebody select-all-and-retype for that is how the count sheet stops getting
 * filled in at all.
 */
export function StepCell({
  value,
  onChange,
  tone,
  dirty,
  disabled,
  placeholder,
}: {
  value: number | null;
  onChange: (next: number | null) => void;
  /** The column's colour, from the header it sits under. */
  tone: { text: string; soft: string };
  dirty?: boolean;
  disabled?: boolean;
  placeholder?: string;
}) {
  const step = (by: number) => onChange(Math.max(0, (value ?? 0) + by));

  if (disabled) {
    return (
      <span className="block text-center text-[13px] font-bold tabular-nums" style={{ color: POS.inkSoft }}>
        {value === null ? "—" : value}
      </span>
    );
  }

  return (
    <span
      className="flex items-center gap-0.5 rounded-lg px-1 py-0.5"
      style={{
        background: tone.soft,
        // A pending edit is outlined, so "12 changes pending" can be seen as
        // well as counted — the row it happened on is the thing being checked.
        boxShadow: dirty ? `inset 0 0 0 1.5px ${tone.text}` : "none",
      }}
    >
      <button
        type="button"
        onClick={() => step(-1)}
        className="h-6 w-5 shrink-0 rounded text-sm font-black leading-none"
        style={{ color: tone.text }}
        aria-label="Less one"
      >
        −
      </button>
      <input
        value={value === null ? "" : String(value)}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^0-9.]/g, "");
          onChange(raw === "" ? null : Math.max(0, Number(raw) || 0));
        }}
        inputMode="decimal"
        placeholder={placeholder ?? "0"}
        className="w-full min-w-0 bg-transparent text-center text-[13px] font-bold tabular-nums focus:outline-none"
        style={{ color: tone.text }}
      />
      <button
        type="button"
        onClick={() => step(1)}
        className="h-6 w-5 shrink-0 rounded text-sm font-black leading-none"
        style={{ color: tone.text }}
        aria-label="One more"
      >
        +
      </button>
    </span>
  );
}

export function Pill({ label, className }: { label: string; className: string }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-bold ${className}`}>{label}</span>
  );
}

export function Modal({
  title,
  subtitle,
  onClose,
  children,
  width = 520,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white"
        style={{ maxWidth: width }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="sticky top-0 flex items-start gap-3 border-b bg-white px-5 py-4"
          style={{ borderColor: POS.line }}
        >
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-black" style={{ color: POS.ink }}>{title}</h2>
            {subtitle && <p className="text-[12px]" style={{ color: POS.inkSoft }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5" style={{ color: POS.inkSoft }} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p
      className="rounded-lg px-3 py-2 text-[12.5px] font-semibold"
      style={{ background: POS.badSoft, color: POS.bad }}
    >
      {message}
    </p>
  );
}

/** The colours the count sheet's five movement columns are drawn in. */
export const COLUMN_TONE = {
  received:  { text: "#1D4ED8", soft: "#EFF6FF" },
  consumed:  { text: "#B45309", soft: "#FFFBEB" },
  writeoff:  { text: "#BE123C", soft: "#FFF1F2" },
  waste:     { text: "#BE123C", soft: "#FFF1F2" },
  physical:  { text: "#B45309", soft: "#FFFBEB" },
} as const;
