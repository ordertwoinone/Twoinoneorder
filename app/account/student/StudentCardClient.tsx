"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, ChevronDown, User as UserIcon, GraduationCap, Landmark, IdCard,
  CalendarDays, ShieldCheck, ArrowRight, Loader2, Check, PartyPopper,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { useTranslation } from "@/lib/i18n/useTranslation";
import PrivilegeCard from "@/components/account/PrivilegeCard";
import {
  UNIVERSITY_CODES, academicYearOptions, type StudentCard, type UniversityCode,
} from "@/lib/student-card";

/**
 * Registering a Student Privilege Card.
 *
 * The card is issued to an account, so this screen starts from one: a signed-out
 * visitor is sent to sign in and comes straight back. Registering used to offer
 * to create the account here, which meant a confirmation e-mail in the middle of
 * the form — and a link that a mail scanner could burn, or that opened on a
 * different phone than the one holding the half-filled form. Nothing survived
 * that round trip reliably, so the round trip is gone.
 */

interface Details {
  full_name: string;
  university: UniversityCode | "";
  academic_year: string;
  date_of_birth: string;
}

const EMPTY: Details = { full_name: "", university: "", academic_year: "", date_of_birth: "" };

function isComplete(details: Details): boolean {
  return (
    details.full_name.trim().length >= 2 &&
    details.university !== "" &&
    details.academic_year !== "" &&
    details.date_of_birth !== ""
  );
}

export default function StudentCardClient() {
  const supabase = createClient();
  const router = useRouter();
  const { t } = useTranslation();

  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [card, setCard] = useState<StudentCard | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [details, setDetails] = useState<Details>(EMPTY);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  /* One issue request at a time — a double tap must not mint two numbers. */
  const issuing = useRef(false);

  const years = useMemo(() => academicYearOptions(), []);

  const issueCard = useCallback(async () => {
    if (issuing.current) return;
    issuing.current = true;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/student-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(details),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.card) {
        setError(data?.error ?? t("studentCard.errors.failed"));
        return;
      }
      setCard(data.card as StudentCard);
      setStep(3);
    } catch {
      setError(t("studentCard.errors.failed"));
    } finally {
      issuing.current = false;
      setBusy(false);
    }
  }, [details, t]);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getUser().then(async ({ data }) => {
      const current = data.user ?? null;
      if (cancelled) return;

      // No account, no card. Sign in first and come straight back here.
      if (!current) {
        router.replace("/account?next=/account/student");
        return;
      }
      setUser(current);

      const res = await fetch("/api/student-card", { cache: "no-store" });
      const body = await res.json().catch(() => ({ card: null }));
      if (cancelled) return;

      if (body.card) {
        setCard(body.card as StudentCard);
        setStep(3);
      } else {
        const meta = current.user_metadata || {};
        setDetails((d) => ({ ...d, full_name: meta.full_name || meta.name || "" }));
      }
      setChecking(false);
    });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function update(patch: Partial<Details>) {
    setDetails((d) => ({ ...d, ...patch }));
    setError("");
  }

  function handleContinue() {
    if (!isComplete(details)) {
      setError(t("studentCard.errors.required"));
      return;
    }
    setError("");
    setStep(2);
  }

  if (checking) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 size={26} className="animate-spin text-orange-500" />
      </div>
    );
  }

  const universityLabel = details.university ? t(`studentCard.universities.${details.university}`) : "";

  return (
    <div className="max-w-md mx-auto px-4 py-5">
      {/* Header */}
      <div className="relative flex items-center justify-center mb-5">
        <Link
          href="/account"
          aria-label={t("common.back")}
          className="absolute start-0 w-9 h-9 -ms-1.5 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft size={22} />
        </Link>
        <div className="text-center">
          <h1 className="text-lg font-extrabold text-gray-900">{t("studentCard.title")}</h1>
          <p className="text-[13px] text-gray-500">{t("studentCard.subtitle")}</p>
        </div>
      </div>

      <Stepper step={step} />

      <PrivilegeCard card={card} className="mt-6" />

      {step === 1 && (
        <>
          <h2 className="text-base font-extrabold text-gray-900 mt-7">{t("studentCard.formTitle")}</h2>
          <p className="text-[13px] text-gray-500 mt-1 mb-4">{t("studentCard.formSub")}</p>

          <div className="space-y-3">
            <Field icon={UserIcon} label={t("studentCard.fullName")} required>
              <input
                type="text"
                value={details.full_name}
                onChange={(e) => update({ full_name: e.target.value })}
                placeholder={t("studentCard.fullNamePlaceholder")}
                className="w-full bg-transparent text-[15px] text-gray-900 placeholder:text-gray-400 focus:outline-none"
              />
            </Field>

            <Field icon={GraduationCap} label={t("studentCard.academicYear")} required select>
              <select
                value={details.academic_year}
                onChange={(e) => update({ academic_year: e.target.value })}
                className={`w-full bg-transparent text-[15px] focus:outline-none appearance-none ${
                  details.academic_year ? "text-gray-900" : "text-gray-400"
                }`}
              >
                <option value="">{t("studentCard.academicYearPlaceholder")}</option>
                {years.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </Field>

            <Field icon={Landmark} label={t("studentCard.university")} required select>
              <select
                value={details.university}
                onChange={(e) => update({ university: e.target.value as UniversityCode })}
                className={`w-full bg-transparent text-[15px] focus:outline-none appearance-none ${
                  details.university ? "text-gray-900" : "text-gray-400"
                }`}
              >
                <option value="">{t("studentCard.universityPlaceholder")}</option>
                {UNIVERSITY_CODES.map((code) => (
                  <option key={code} value={code}>{t(`studentCard.universities.${code}`)}</option>
                ))}
              </select>
            </Field>

            {/* Not asked for — the number is minted when the card is issued. */}
            <Field icon={IdCard} label={t("studentCard.memberId")}>
              <p className="text-[15px] text-gray-400">{t("studentCard.memberIdAuto")}</p>
            </Field>

            <Field icon={CalendarDays} label={t("studentCard.dateOfBirth")} required>
              <input
                type="date"
                value={details.date_of_birth}
                onChange={(e) => update({ date_of_birth: e.target.value })}
                max={new Date().toISOString().slice(0, 10)}
                dir="ltr"
                className={`w-full bg-transparent text-[15px] focus:outline-none ${
                  details.date_of_birth ? "text-gray-900" : "text-gray-400"
                }`}
              />
            </Field>
          </div>

          <div className="flex items-start gap-3 bg-orange-50/70 rounded-2xl px-4 py-3.5 mt-4">
            <ShieldCheck size={20} className="text-orange-500 shrink-0 mt-0.5" />
            <p className="text-[13px] text-gray-600 leading-snug">{t("studentCard.secureNote")}</p>
          </div>

          {error && <p className="text-[13px] text-red-600 bg-red-50 px-3 py-2 rounded-lg mt-3">{error}</p>}

          <button
            onClick={handleContinue}
            className="w-full mt-4 flex items-center justify-center gap-2 py-4 rounded-2xl text-white text-[15px] font-bold transition hover:opacity-95"
            style={{ background: "#e8521a" }}
          >
            {t("studentCard.continue")}
            <ArrowRight size={18} />
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <h2 className="text-base font-extrabold text-gray-900 mt-7">{t("studentCard.verifyTitle")}</h2>
          <p className="text-[13px] text-gray-500 mt-1 mb-4">{t("studentCard.verifySub")}</p>

          <div className="rounded-2xl border border-gray-200 divide-y divide-gray-100">
            <Row label={t("studentCard.fullName")} value={details.full_name} />
            <Row label={t("studentCard.academicYear")} value={details.academic_year} />
            <Row label={t("studentCard.university")} value={universityLabel} />
            <Row label={t("studentCard.dateOfBirth")} value={details.date_of_birth} ltr />
            <Row label={t("studentCard.account")} value={user?.email ?? ""} ltr />
          </div>

          {error && <p className="text-[13px] text-red-600 bg-red-50 px-3 py-2 rounded-lg mt-3">{error}</p>}

          <button
            onClick={() => void issueCard()}
            disabled={busy}
            className="w-full mt-4 flex items-center justify-center gap-2 py-4 rounded-2xl text-white text-[15px] font-bold transition disabled:opacity-70"
            style={{ background: "#e8521a" }}
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            {busy ? t("studentCard.issuingTitle") : t("studentCard.issueCard")}
          </button>

          <button
            onClick={() => { setStep(1); setError(""); }}
            className="w-full mt-3 py-3 rounded-2xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {t("common.back")}
          </button>
        </>
      )}

      {step === 3 && (
        <div className="mt-7 text-center">
          <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto">
            <Check size={26} className="text-green-600" />
          </div>
          <h2 className="text-lg font-extrabold text-gray-900 mt-3">{t("studentCard.completeTitle")}</h2>
          <p className="text-[13px] text-gray-500 mt-1">
            {t("studentCard.completeSub", { percent: card?.discount_percent ?? 10 })}
          </p>

          <div className="flex items-start gap-3 bg-orange-50/70 rounded-2xl px-4 py-3.5 mt-5 text-start">
            <PartyPopper size={20} className="text-orange-500 shrink-0 mt-0.5" />
            <p className="text-[13px] text-gray-600 leading-snug">{t("account.valuedSub")}</p>
          </div>

          <Link
            href="/account"
            className="w-full mt-4 flex items-center justify-center gap-2 py-4 rounded-2xl text-white text-[15px] font-bold"
            style={{ background: "#e8521a" }}
          >
            {t("studentCard.goToAccount")}
            <ArrowRight size={18} />
          </Link>
        </div>
      )}
    </div>
  );
}

/** 1 Information — 2 Verify — 3 Complete */
function Stepper({ step }: { step: 1 | 2 | 3 }) {
  const { t } = useTranslation();
  const labels = [
    t("studentCard.steps.information"),
    t("studentCard.steps.verify"),
    t("studentCard.steps.complete"),
  ];

  return (
    <div className="flex items-start">
      {labels.map((label, index) => {
        const number = index + 1;
        const active = number <= step;
        return (
          <div key={label} className="flex-1 flex items-start">
            <div className="flex flex-col items-center gap-1.5 w-16 shrink-0">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold transition-colors ${
                  active ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-400"
                }`}
              >
                {number < step ? <Check size={14} /> : number}
              </span>
              <span className={`text-[11px] font-semibold ${active ? "text-orange-600" : "text-gray-400"}`}>
                {label}
              </span>
            </div>
            {number < labels.length && (
              <span className={`flex-1 h-px mt-3.5 ${number < step ? "bg-orange-300" : "bg-gray-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/** A labelled box from the card design: icon, small caption, value beneath. */
function Field({
  icon: Icon,
  label,
  required = false,
  select = false,
  children,
}: {
  icon: LucideIcon;
  label: string;
  required?: boolean;
  select?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-gray-200 bg-white focus-within:border-orange-300 focus-within:ring-2 focus-within:ring-orange-100 transition">
      <Icon size={20} className="text-gray-400 shrink-0" />
      <span className="flex-1 min-w-0">
        <span className="block text-[12px] text-gray-500 mb-0.5">
          {label} {required && <span className="text-orange-500">*</span>}
        </span>
        {children}
      </span>
      {select && <ChevronDown size={18} className="text-gray-400 shrink-0" />}
    </label>
  );
}

function Row({ label, value, ltr = false }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <span className="text-[12px] text-gray-500 shrink-0">{label}</span>
      <span className={`text-[14px] font-semibold text-gray-900 truncate ${ltr ? "force-ltr" : ""}`}>
        {value}
      </span>
    </div>
  );
}
