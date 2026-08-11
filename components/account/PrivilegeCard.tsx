"use client";

import { useTranslation } from "@/lib/i18n/useTranslation";
import {
  STUDENT_DISCOUNT_PERCENT,
  formatCardNumber,
  formatValidThru,
  type StudentCard,
} from "@/lib/student-card";

/**
 * The Student Privilege Card, drawn rather than photographed.
 *
 * With no card it shows the blank stock — zeroed number, no name — which is
 * what the sign-up screen puts above the form. Hand it a card and the same
 * artwork carries that student's own number.
 *
 * Everything is sized in `cqw` against the card's own width, so one component
 * serves the phone, the account page and the wide preview without a second set
 * of type sizes. The card itself is always laid out left-to-right: it is a
 * physical object, and its number does not mirror in Arabic.
 */
export default function PrivilegeCard({
  card,
  className = "",
}: {
  card?: StudentCard | null;
  className?: string;
}) {
  const { t } = useTranslation();

  const number = card ? formatCardNumber(card.card_number) : "0000 0000 0000 0000";
  const memberId = card?.member_id ?? "KU-00000";
  const validThru = card ? formatValidThru(card.valid_thru) : "00/00";
  const percent = card?.discount_percent ?? STUDENT_DISCOUNT_PERCENT;

  return (
    <div
      dir="ltr"
      className={`relative w-full aspect-[1.58] rounded-2xl overflow-hidden shadow-lg shadow-gray-200/70 border border-gray-100 ${className}`}
      style={{
        containerType: "inline-size",
        background: "linear-gradient(135deg,#fbfaf9 0%,#f4f1ee 55%,#efeae5 100%)",
      }}
    >
      {/* Engraving: the campus building, and the guilloche waves under the number */}
      <Building className="absolute text-[#e8521a]" style={{ right: "4cqw", bottom: "6cqw", width: "34cqw", opacity: 0.16 }} />
      <Waves />

      {/* Issuer tab */}
      <div
        className="absolute top-0 right-0 flex flex-col items-center justify-center text-white text-center"
        style={{ width: "23cqw", height: "36cqw", background: "#e8521a", borderBottomLeftRadius: "3cqw", padding: "2cqw" }}
      >
        <Building className="text-white" style={{ width: "11cqw", opacity: 0.9 }} />
        <span style={{ fontSize: "2.5cqw", lineHeight: 1.25, fontWeight: 700, marginTop: "1cqw" }}>
          {t("studentCard.card.issuer")}
        </span>
      </div>

      <div className="relative h-full flex flex-col" style={{ padding: "5cqw" }}>
        {/* Brand + card name */}
        <div className="flex items-start" style={{ gap: "5cqw" }}>
          <div className="shrink-0">
            <p style={{ fontSize: "8cqw", lineHeight: 0.92, fontWeight: 800, color: "#1a1a1a", letterSpacing: "-0.02em" }}>
              two
            </p>
            <p style={{ fontSize: "8cqw", lineHeight: 0.92, fontWeight: 800, color: "#1a1a1a", letterSpacing: "-0.02em" }}>
              in <span style={{ color: "#e8521a" }}>one</span>
            </p>
            <p
              style={{
                fontSize: "2.6cqw",
                fontWeight: 700,
                letterSpacing: "0.12em",
                color: "#1a1a1a",
                marginTop: "1cqw",
                paddingTop: "1cqw",
                borderTop: "0.3cqw solid #1a1a1a",
              }}
            >
              {t("studentCard.card.cafe")}
            </p>
            <p style={{ fontSize: "2.1cqw", fontWeight: 600, color: "#6b7280", marginTop: "0.6cqw" }}>
              {t("studentCard.card.tagline")}
            </p>
          </div>

          <div style={{ marginTop: "1cqw" }}>
            <p style={{ fontSize: "5.4cqw", lineHeight: 1.1, fontWeight: 800, color: "#e8521a", letterSpacing: "0.01em" }}>
              {t("studentCard.card.student")}
            </p>
            <p style={{ fontSize: "5.4cqw", lineHeight: 1.1, fontWeight: 800, color: "#1a1a1a", letterSpacing: "0.01em" }}>
              {t("studentCard.card.privilege")}
            </p>
          </div>
        </div>

        {/* Number */}
        <p
          className="tabular-nums"
          style={{
            fontSize: "7.6cqw",
            fontWeight: 500,
            color: "#1a1a1a",
            letterSpacing: "0.06em",
            marginTop: "auto",
          }}
        >
          {number}
        </p>

        {/* Issue details */}
        <div className="flex items-end" style={{ marginTop: "3cqw", gap: "6cqw" }}>
          <div>
            <Label>{t("studentCard.card.memberId")}</Label>
            <Value>{memberId}</Value>
          </div>
          <div>
            <Label>{t("studentCard.card.validThru")}</Label>
            <Value>{validThru}</Value>
          </div>
          <div className="ms-auto text-right">
            <p style={{ fontSize: "9cqw", lineHeight: 1, fontWeight: 800, color: "#e8521a" }}>{percent}%</p>
            <p style={{ fontSize: "2.5cqw", lineHeight: 1.25, fontWeight: 700, color: "#4b5563", marginTop: "0.8cqw" }}>
              {t("studentCard.card.discountLine1")}
              <br />
              {t("studentCard.card.discountLine2")}
            </p>
          </div>
        </div>

        {/* Holder — blank stock carries no name */}
        {card && (
          <div style={{ marginTop: "2.5cqw" }}>
            <p style={{ fontSize: "4cqw", fontWeight: 700, color: "#1a1a1a", letterSpacing: "0.06em" }}>
              {card.full_name.toUpperCase()}
            </p>
            <p style={{ fontSize: "2.6cqw", fontWeight: 700, color: "#4b5563", letterSpacing: "0.05em", marginTop: "0.5cqw" }}>
              {t("studentCard.card.academicYear", { year: card.academic_year })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: "2.4cqw", fontWeight: 700, color: "#4b5563", letterSpacing: "0.08em" }}>
      {children}
    </p>
  );
}

function Value({ children }: { children: React.ReactNode }) {
  return (
    <p className="tabular-nums" style={{ fontSize: "3.4cqw", fontWeight: 600, color: "#1a1a1a", letterSpacing: "0.04em", marginTop: "0.4cqw" }}>
      {children}
    </p>
  );
}

/** The campus building — the tab glyph and, blown up, the card's engraving. */
function Building({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 64 48" fill="none" stroke="currentColor" strokeWidth="1.6" className={className} style={style} aria-hidden>
      <path d="M32 3 58 15H6L32 3Z" />
      <path d="M10 15v26M20 15v26M32 15v26M44 15v26M54 15v26" />
      <path d="M4 41h56M2 46h60M6 15h52" />
      <path d="M28 30h8v11h-8z" />
    </svg>
  );
}

/** Guilloche waves, the security pattern printed under the number. */
function Waves() {
  return (
    <svg
      viewBox="0 0 400 120"
      preserveAspectRatio="none"
      className="absolute inset-x-0 pointer-events-none"
      style={{ top: "38%", height: "34%", opacity: 0.35 }}
      aria-hidden
    >
      {[0, 7, 14, 21, 28, 35].map((offset) => (
        <path
          key={offset}
          d={`M0 ${40 + offset} C 90 ${offset}, 190 ${80 + offset}, 400 ${20 + offset}`}
          fill="none"
          stroke="#e8521a"
          strokeWidth="0.8"
        />
      ))}
    </svg>
  );
}
