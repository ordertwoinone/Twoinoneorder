"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft, ChevronDown, User as UserIcon, GraduationCap, Landmark, IdCard,
  CalendarDays, ShieldCheck, ArrowRight, Loader2, Check, Mail, Lock, PartyPopper,
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
 * Where a student's details wait while they go and confirm their e-mail.
 *
 * The card can only be issued to an account, and a fresh sign-up has no session
 * until the confirmation link is clicked. Rather than make them type everything
 * a second time, step 1 is kept here and issued the moment they come back
 * signed in — from this screen or any other.
 */
const DRAFT_KEY = "two-in-one:student-card-draft";

interface Draft {
  full_name: string;
  university: UniversityCode | "";
  academic_year: string;
  date_of_birth: string;
}

const EMPTY_DRAFT: Draft = { full_name: "", university: "", academic_year: "", date_of_birth: "" };

function readDraft(): Draft | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

function isComplete(draft: Draft): boolean {
  return (
    draft.full_name.trim().length >= 2 &&
    draft.university !== "" &&
    draft.academic_year !== "" &&
    draft.date_of_birth !== ""
  );
}

export default function StudentCardClient() {
  const supabase = createClient();
  const { t } = useTranslation();

  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [card, setCard] = useState<StudentCard | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Verify step — only used while signed out.
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [awaitingEmail, setAwaitingEmail] = useState(false);

  /* One issue request at a time: the auth listener and the button can both
     arrive at this point within the same tick. */
  const issuing = useRef(false);

  const years = useMemo(() => academicYearOptions(), []);

  const issueCard = useCallback(
    async (details: Draft) => {
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
        const data = await res.json();
        if (!res.ok || !data.card) {
          setError(data.error ?? t("studentCard.errors.failed"));
          return;
        }
        window.localStorage.removeItem(DRAFT_KEY);
        setCard(data.card as StudentCard);
        setStep(3);
      } catch {
        setError(t("studentCard.errors.failed"));
      } finally {
        issuing.current = false;
        setBusy(false);
      }
    },
    [t],
  );

  // Pick up where the student left off: their card, or the draft behind it.
  useEffect(() => {
    let cancelled = false;

    async function bootstrap(current: User | null) {
      const saved = readDraft();
      if (saved) setDraft(saved);

      if (!current) {
        setChecking(false);
        return;
      }

      const res = await fetch("/api/student-card", { cache: "no-store" });
      const data = await res.json().catch(() => ({ card: null }));
      if (cancelled) return;

      if (data.card) {
        setCard(data.card as StudentCard);
        setStep(3);
      } else if (saved && isComplete(saved)) {
        setStep(2);
        void issueCard(saved);
      } else if (!saved?.full_name) {
        const meta = current.user_metadata || {};
        setDraft((d) => ({ ...d, full_name: meta.full_name || meta.name || "" }));
      }
      setChecking(false);
    }

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      void bootstrap(data.user ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const next = session?.user ?? null;
      setUser(next);
      // Signing in on step 2 is the last thing the card was waiting for.
      if (next && !card) {
        const saved = readDraft();
        if (saved && isComplete(saved)) void issueCard(saved);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function update(patch: Partial<Draft>) {
    setDraft((d) => ({ ...d, ...patch }));
    setError("");
  }

  function handleContinue() {
    if (!isComplete(draft)) {
      setError(t("studentCard.errors.required"));
      return;
    }
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    setStep(2);
    if (user) void issueCard(draft);
  }

  async function handleGoogle() {
    setError("");
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/account/student` },
    });
  }

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");

    if (mode === "signin") {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) setError(authError.message);
      // The auth listener issues the card once the session lands.
    } else {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: draft.full_name },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/account/student`,
        },
      });
      if (authError) setError(authError.message);
      // No session means confirmations are on: the draft waits for their return.
      else if (!data.session) setAwaitingEmail(true);
    }
    setBusy(false);
  }

  if (checking) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 size={26} className="animate-spin text-orange-500" />
      </div>
    );
  }

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
                value={draft.full_name}
                onChange={(e) => update({ full_name: e.target.value })}
                placeholder={t("studentCard.fullNamePlaceholder")}
                className="w-full bg-transparent text-[15px] text-gray-900 placeholder:text-gray-400 focus:outline-none"
              />
            </Field>

            <Field icon={GraduationCap} label={t("studentCard.academicYear")} required select>
              <select
                value={draft.academic_year}
                onChange={(e) => update({ academic_year: e.target.value })}
                className={`w-full bg-transparent text-[15px] focus:outline-none appearance-none ${
                  draft.academic_year ? "text-gray-900" : "text-gray-400"
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
                value={draft.university}
                onChange={(e) => update({ university: e.target.value as UniversityCode })}
                className={`w-full bg-transparent text-[15px] focus:outline-none appearance-none ${
                  draft.university ? "text-gray-900" : "text-gray-400"
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
                value={draft.date_of_birth}
                onChange={(e) => update({ date_of_birth: e.target.value })}
                max={new Date().toISOString().slice(0, 10)}
                dir="ltr"
                className={`w-full bg-transparent text-[15px] focus:outline-none ${
                  draft.date_of_birth ? "text-gray-900" : "text-gray-400"
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
        <div className="mt-7">
          {awaitingEmail ? (
            <Notice
              icon={Mail}
              title={t("studentCard.confirmEmailTitle")}
              body={t("studentCard.confirmEmailSub", { email })}
            />
          ) : user ? (
            <>
              <h2 className="text-base font-extrabold text-gray-900">{t("studentCard.issuingTitle")}</h2>
              <p className="text-[13px] text-gray-500 mt-1">
                {t("studentCard.signedInAs", { email: user.email ?? "" })}
              </p>
              <div className="py-10 flex justify-center">
                {busy ? (
                  <Loader2 size={24} className="animate-spin text-orange-500" />
                ) : (
                  <button
                    onClick={() => void issueCard(draft)}
                    className="px-6 py-3.5 rounded-2xl text-white text-[15px] font-bold"
                    style={{ background: "#e8521a" }}
                  >
                    {t("studentCard.issueCard")}
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <h2 className="text-base font-extrabold text-gray-900">{t("studentCard.verifyTitle")}</h2>
              <p className="text-[13px] text-gray-500 mt-1 mb-4">{t("studentCard.verifySub")}</p>

              <button
                onClick={handleGoogle}
                className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <GoogleIcon />
                {t("account.continueGoogle")}
              </button>

              <div className="flex items-center gap-3 my-5">
                <span className="flex-1 h-px bg-gray-100" />
                <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">{t("common.or")}</span>
                <span className="flex-1 h-px bg-gray-100" />
              </div>

              <form onSubmit={handleAuth} className="space-y-3.5">
                <div className="relative">
                  <Mail size={16} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder={t("account.emailPlaceholder")}
                    dir="ltr"
                    className="w-full ps-10 pe-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
                  />
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder={t("account.passwordPlaceholder")}
                    dir="ltr"
                    className="w-full ps-10 pe-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
                  />
                </div>

                {error && <p className="text-[13px] text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white text-[15px] font-bold transition disabled:opacity-70"
                  style={{ background: "#e8521a" }}
                >
                  {busy && <Loader2 size={15} className="animate-spin" />}
                  {mode === "signup" ? t("account.createAccount") : t("common.signIn")}
                </button>
              </form>

              <p className="text-center text-sm text-gray-500 mt-5">
                {mode === "signup" ? t("account.haveAccount") : t("account.noAccount")}
                <button
                  onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setError(""); }}
                  className="font-bold text-orange-600 hover:underline"
                >
                  {mode === "signup" ? t("common.signIn") : t("common.signUp")}
                </button>
              </p>
            </>
          )}

          {!awaitingEmail && (
            <button
              onClick={() => setStep(1)}
              className="w-full mt-4 py-3 rounded-2xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              {t("common.back")}
            </button>
          )}
        </div>
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

          {error && <p className="text-[13px] text-red-600 bg-red-50 px-3 py-2 rounded-lg mt-3">{error}</p>}

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
            <div className="flex flex-col items-center gap-1.5 w-14 shrink-0">
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

function Notice({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-3 bg-orange-50/70 rounded-2xl px-4 py-4">
      <Icon size={20} className="text-orange-500 shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-bold text-gray-900">{title}</p>
        <p className="text-[13px] text-gray-600 leading-snug mt-0.5">{body}</p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}
