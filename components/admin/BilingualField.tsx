"use client";

/**
 * An English input with its Arabic twin underneath.
 *
 * Used everywhere in the admin panel that edits customer-facing wording. The
 * Arabic box is optional by design — leave it blank and the live site falls
 * back to the English text, so translations can be filled in gradually without
 * ever leaving a gap on the page.
 *
 * The Arabic box types right-to-left and renders in an Arabic face, so what you
 * type here reads the way it will on the site.
 */

const inputCls =
  "w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400";

interface Props {
  label: string;
  value: string;
  valueAr: string;
  onChange: (v: string) => void;
  onChangeAr: (v: string) => void;
  placeholder?: string;
  placeholderAr?: string;
  hint?: string;
  /** Renders a textarea instead of a single-line input. */
  multiline?: boolean;
  rows?: number;
}

export default function BilingualField({
  label,
  value,
  valueAr,
  onChange,
  onChangeAr,
  placeholder,
  placeholderAr,
  hint,
  multiline = false,
  rows = 3,
}: Props) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
        {label}
        {hint && <span className="font-normal text-gray-400"> {hint}</span>}
      </label>

      <div className="space-y-1.5">
        {/* English */}
        <div className="relative">
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-gray-300 pointer-events-none">
            EN
          </span>
          {multiline ? (
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              rows={rows}
              placeholder={placeholder}
              className={`${inputCls} pr-8 resize-y`}
            />
          ) : (
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className={`${inputCls} pr-8`}
            />
          )}
        </div>

        {/* Arabic */}
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-gray-300 pointer-events-none">
            ع
          </span>
          {multiline ? (
            <textarea
              value={valueAr}
              onChange={(e) => onChangeAr(e.target.value)}
              rows={rows}
              dir="rtl"
              lang="ar"
              placeholder={placeholderAr ?? "بالعربية (اختياري)"}
              className={`${inputCls} pl-8 resize-y bg-orange-50/30`}
              style={{ fontFamily: "var(--font-ar), inherit" }}
            />
          ) : (
            <input
              type="text"
              value={valueAr}
              onChange={(e) => onChangeAr(e.target.value)}
              dir="rtl"
              lang="ar"
              placeholder={placeholderAr ?? "بالعربية (اختياري)"}
              className={`${inputCls} pl-8 bg-orange-50/30`}
              style={{ fontFamily: "var(--font-ar), inherit" }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
