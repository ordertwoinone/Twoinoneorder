"use client";

import { useEffect, useRef, useState } from "react";
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
 * The artwork is laid out once at a fixed 640×405 and then scaled to whatever
 * width it is given. Every position is absolute against that one size, so the
 * card cannot reflow, crowd its own tab or overflow on a narrow phone: it is
 * the same picture at every width. (An earlier version sized the type in `cqw`,
 * which collapses on browsers without container queries — a blank-looking
 * card.)
 */
const W = 640;
const H = 405;

export default function PrivilegeCard({
  card,
  className = "",
}: {
  card?: StudentCard | null;
  className?: string;
}) {
  const { t } = useTranslation();
  const frame = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const element = frame.current;
    if (!element) return;

    const measure = () => setScale(element.clientWidth / W);
    measure();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const number = card ? formatCardNumber(card.card_number) : "0000 0000 0000 0000";
  const memberId = card?.member_id ?? "KU-00000";
  const validThru = card ? formatValidThru(card.valid_thru) : "00/00";
  const percent = card?.discount_percent ?? STUDENT_DISCOUNT_PERCENT;

  return (
    <div
      ref={frame}
      dir="ltr"
      className={`relative w-full overflow-hidden ${className}`}
      // Reserve the right height from the first paint, before the measurement.
      style={{ aspectRatio: `${W} / ${H}` }}
    >
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{ width: W, height: H, transform: `scale(${scale || 0.001})` }}
      >
        <div
          className="relative w-full h-full overflow-hidden rounded-[22px] border border-gray-100"
          style={{
            background: "linear-gradient(135deg,#fbfaf9 0%,#f4f1ee 55%,#efeae5 100%)",
            boxShadow: "0 10px 30px -12px rgba(17,24,39,0.25)",
          }}
        >
          {/* Engraving: the campus building, and the guilloche waves it sits on */}
          <Building className="absolute text-[#e8521a]" style={{ right: 34, bottom: 26, width: 210, opacity: 0.15 }} />
          <Waves />

          {/* Issuer tab */}
          <div
            className="absolute top-0 right-0 flex flex-col items-center justify-center text-center text-white"
            style={{ width: 128, height: 132, background: "#e8521a", borderBottomLeftRadius: 20, padding: 10 }}
          >
            <Building className="text-white" style={{ width: 54, opacity: 0.95 }} />
            <span style={{ fontSize: 12, lineHeight: 1.25, fontWeight: 700, marginTop: 6, letterSpacing: "0.02em" }}>
              {t("studentCard.card.issuer")}
            </span>
          </div>

          {/* Brand */}
          <div className="absolute" style={{ left: 34, top: 30, width: 190 }}>
            <p style={{ fontSize: 46, lineHeight: 0.92, fontWeight: 800, color: "#1a1a1a", letterSpacing: "-0.02em" }}>
              two
            </p>
            <p style={{ fontSize: 46, lineHeight: 0.92, fontWeight: 800, color: "#1a1a1a", letterSpacing: "-0.02em" }}>
              in <span style={{ color: "#e8521a" }}>one</span>
            </p>
            <p
              style={{
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.14em",
                color: "#1a1a1a",
                marginTop: 6,
                paddingTop: 5,
                borderTop: "2px solid #1a1a1a",
                display: "inline-block",
              }}
            >
              {t("studentCard.card.cafe")}
            </p>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", marginTop: 4 }}>
              {t("studentCard.card.tagline")}
            </p>
          </div>

          {/* Card name — kept clear of the tab */}
          <div className="absolute" style={{ left: 250, top: 42, width: 250 }}>
            <p style={{ fontSize: 30, lineHeight: 1.15, fontWeight: 800, color: "#e8521a" }}>
              {t("studentCard.card.student")}
            </p>
            <p style={{ fontSize: 30, lineHeight: 1.15, fontWeight: 800, color: "#1a1a1a" }}>
              {t("studentCard.card.privilege")}
            </p>
          </div>

          {/* Number */}
          <p
            className="absolute tabular-nums"
            style={{ left: 36, top: 218, fontSize: 38, fontWeight: 500, color: "#1a1a1a", letterSpacing: "0.07em" }}
          >
            {number}
          </p>

          {/* Issue details */}
          <div className="absolute" style={{ left: 36, top: 288 }}>
            <Label>{t("studentCard.card.memberId")}</Label>
            <Value>{memberId}</Value>
          </div>
          <div className="absolute" style={{ left: 226, top: 288 }}>
            <Label>{t("studentCard.card.validThru")}</Label>
            <Value>{validThru}</Value>
          </div>

          <div className="absolute text-right" style={{ right: 34, top: 278, width: 180 }}>
            <p style={{ fontSize: 44, lineHeight: 1, fontWeight: 800, color: "#e8521a" }}>{percent}%</p>
            <p style={{ fontSize: 12, lineHeight: 1.3, fontWeight: 700, color: "#4b5563", marginTop: 4 }}>
              {t("studentCard.card.discountLine1")}
              <br />
              {t("studentCard.card.discountLine2")}
            </p>
          </div>

          {/* Holder — blank stock carries no name */}
          {card && (
            <div className="absolute" style={{ left: 36, top: 340, width: 400 }}>
              <p className="truncate" style={{ fontSize: 19, fontWeight: 700, color: "#1a1a1a", letterSpacing: "0.07em" }}>
                {card.full_name.toUpperCase()}
              </p>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#4b5563", letterSpacing: "0.06em", marginTop: 3 }}>
                {t("studentCard.card.academicYear", { year: card.academic_year })}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 11, fontWeight: 700, color: "#4b5563", letterSpacing: "0.09em" }}>{children}</p>;
}

function Value({ children }: { children: React.ReactNode }) {
  return (
    <p className="tabular-nums" style={{ fontSize: 17, fontWeight: 600, color: "#1a1a1a", letterSpacing: "0.04em", marginTop: 2 }}>
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
      className="absolute pointer-events-none"
      style={{ left: 0, right: 0, top: 150, width: W, height: 130, opacity: 0.4 }}
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
