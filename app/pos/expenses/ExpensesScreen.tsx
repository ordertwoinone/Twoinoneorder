"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Banknote, CreditCard, Receipt, Trash2, Wallet } from "lucide-react";
import { POS } from "@/lib/pos/theme";
import { aed } from "@/lib/pos/cart";
import type { PosStaff } from "@/lib/pos/constants";
import PosShell from "@/components/pos/PosShell";

/**
 * Money out of the drawer during a shift.
 *
 * Only cash leaves the till, so the running impact on the drawer counts cash
 * lines alone — a card expense is real money but it never came out of the
 * cashier's float, and taking it off would make every close read short.
 */

interface Expense {
  id: string;
  category: string;
  description: string;
  supplier: string;
  reference: string;
  amount: number | string;
  payment_method: string;
  receipt_url: string;
  spent_at: string;
}

const METHODS = ["cash", "card", "transfer"] as const;

const num = (v: unknown) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
};

export default function ExpensesScreen({
  staff,
  openingFloat,
}: {
  staff: PosStaff;
  openingFloat: number;
}) {
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [managerOver, setManagerOver] = useState(500);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    category: "",
    description: "",
    supplier: "",
    reference: "",
    amount: "",
    payment_method: "cash" as (typeof METHODS)[number],
    vat_included: false,
    note: "",
  });

  const load = useCallback(async () => {
    const res = await fetch("/api/pos/expenses", { cache: "no-store" });
    const body = await res.json().catch(() => null);
    if (body?.expenses) {
      setExpenses(body.expenses as Expense[]);
      setCategories(body.categories ?? []);
      setManagerOver(Number(body.managerExpenseOver) || 500);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totals = useMemo(() => {
    let cash = 0;
    let other = 0;
    for (const e of expenses) {
      if (e.payment_method === "cash") cash += num(e.amount);
      else other += num(e.amount);
    }
    return { cash, other, all: cash + other };
  }, [expenses]);

  async function save() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/pos/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount: Number(form.amount) || 0 }),
    });
    const body = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setError(body?.error || "That did not save.");
      return;
    }
    setForm((f) => ({ ...f, description: "", supplier: "", reference: "", amount: "", note: "" }));
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/pos/expenses/${id}`, { method: "DELETE" });
    load();
  }

  const needsManager = (Number(form.amount) || 0) >= managerOver && staff.role !== "manager";

  return (
    <PosShell
      staff={staff}
      title="Daily Expenses"
      subtitle={`${expenses.length} entr${expenses.length === 1 ? "y" : "ies"} this shift`}
      actions={
        <button
          onClick={() => router.push("/pos/close")}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-bold text-white"
          style={{ background: POS.action }}
        >
          Continue to Day Close
          <ArrowRight size={15} />
        </button>
      }
    >
      <div className="pos-scroll h-full p-4">
        {/* ─── Totals ─── */}
        <div className="grid gap-3 sm:grid-cols-4 mb-4">
          <Stat label="Today's expenses" value={aed(totals.all)} icon={<Receipt size={17} />} />
          <Stat label="Cash expenses" value={aed(totals.cash)} icon={<Banknote size={17} />} tone={POS.good} />
          <Stat label="Card / transfer" value={aed(totals.other)} icon={<CreditCard size={17} />} />
          <Stat label="Entries" value={String(expenses.length)} icon={<Wallet size={17} />} />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
          {/* ─── What has gone out ─── */}
          <section className="rounded-2xl bg-white p-4" style={{ border: `1px solid ${POS.line}` }}>
            <h2 className="mb-3 text-sm font-bold" style={{ color: POS.ink }}>Expense entries</h2>
            {expenses.length === 0 ? (
              <p className="py-12 text-center text-[13px]" style={{ color: POS.inkSoft }}>
                Nothing paid out yet this shift.
              </p>
            ) : (
              <table className="w-full text-[13px]">
                <thead>
                  <tr style={{ color: POS.inkSoft }}>
                    {["Time", "Category", "Description", "Paid", "Amount", ""].map((h) => (
                      <th key={h} className="pb-2 text-left text-[11px] font-bold uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e) => (
                    <tr key={e.id} style={{ borderTop: `1px solid ${POS.line}` }}>
                      <td className="py-2.5" style={{ color: POS.inkSoft }}>
                        {new Date(e.spent_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="py-2.5 font-semibold" style={{ color: POS.ink }}>{e.category}</td>
                      <td className="py-2.5" style={{ color: POS.inkSoft }}>{e.description || "—"}</td>
                      <td className="py-2.5 capitalize" style={{ color: POS.inkSoft }}>{e.payment_method}</td>
                      <td className="py-2.5 font-bold" style={{ color: POS.ink }}>{aed(num(e.amount))}</td>
                      <td className="py-2.5 text-right">
                        <button
                          onClick={() => remove(e.id)}
                          aria-label="Remove this expense"
                          className="rounded p-1.5"
                          style={{ color: POS.bad }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: `2px solid ${POS.line}` }}>
                    <td colSpan={4} className="pt-2.5 font-black" style={{ color: POS.ink }}>Total</td>
                    <td className="pt-2.5 font-black" style={{ color: POS.ink }}>{aed(totals.all)}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            )}
          </section>

          {/* ─── Adding one ─── */}
          <section className="rounded-2xl bg-white p-4 space-y-3" style={{ border: `1px solid ${POS.line}` }}>
            <h2 className="text-sm font-bold" style={{ color: POS.ink }}>Add an expense</h2>

            <Field label="Category">
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full rounded-lg px-3 py-2.5 text-[13px] bg-white focus:outline-none"
                style={{ border: `1px solid ${POS.line}`, color: POS.ink }}
              >
                <option value="">Select a category</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>

            <Field label="Description">
              <Text value={form.description} onChange={(v) => setForm((f) => ({ ...f, description: v }))} placeholder="Detergent and tissues" />
            </Field>

            <div className="grid grid-cols-2 gap-2">
              <Field label="Supplier">
                <Text value={form.supplier} onChange={(v) => setForm((f) => ({ ...f, supplier: v }))} placeholder="Optional" />
              </Field>
              <Field label="Receipt no.">
                <Text value={form.reference} onChange={(v) => setForm((f) => ({ ...f, reference: v }))} placeholder="Optional" />
              </Field>
            </div>

            <Field label="Amount (AED)">
              <input
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value.replace(/[^0-9.]/g, "") }))}
                inputMode="decimal"
                placeholder="0.00"
                className="w-full rounded-lg px-3 text-xl font-black focus:outline-none"
                style={{ border: `1px solid ${POS.line}`, color: POS.ink, height: 48 }}
              />
            </Field>

            <Field label="Paid with">
              <div className="grid grid-cols-3 gap-2">
                {METHODS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setForm((f) => ({ ...f, payment_method: m }))}
                    className="rounded-lg py-2 text-[12.5px] font-bold capitalize"
                    style={{
                      background: form.payment_method === m ? POS.action : "#fff",
                      color: form.payment_method === m ? "#fff" : POS.inkSoft,
                      border: `1px solid ${form.payment_method === m ? POS.action : POS.line}`,
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </Field>

            <div
              className="rounded-lg px-3 py-2.5 text-[12px]"
              style={{ background: POS.page, color: POS.inkSoft }}
            >
              <p>
                Opening float <strong style={{ color: POS.ink }}>{aed(openingFloat)}</strong>
              </p>
              <p className="mt-0.5">
                Cash out <strong style={{ color: POS.bad }}>−{aed(totals.cash)}</strong> — only cash
                comes off the drawer at close.
              </p>
            </div>

            {needsManager && (
              <p className="text-[12px] font-semibold" style={{ color: POS.warn }}>
                AED {managerOver} and over needs a manager signed in.
              </p>
            )}

            {error && (
              <p
                className="rounded-lg px-3 py-2 text-[12px] font-semibold"
                style={{ background: POS.badSoft, color: POS.bad }}
              >
                {error}
              </p>
            )}

            <button
              onClick={save}
              disabled={busy || !form.category || !(Number(form.amount) > 0)}
              className="w-full rounded-xl text-[14px] font-bold text-white disabled:opacity-40"
              style={{ background: POS.action, height: 48 }}
            >
              {busy ? "Saving…" : "Save expense"}
            </button>
          </section>
        </div>
      </div>
    </PosShell>
  );
}

function Stat({ label, value, icon, tone }: { label: string; value: string; icon: React.ReactNode; tone?: string }) {
  return (
    <div className="rounded-2xl bg-white p-3.5 flex items-center gap-3" style={{ border: `1px solid ${POS.line}` }}>
      <span
        className="flex h-10 w-10 items-center justify-center rounded-xl"
        style={{ background: POS.page, color: tone ?? POS.inkSoft }}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[11.5px]" style={{ color: POS.inkSoft }}>{label}</span>
        <span className="block text-lg font-black truncate" style={{ color: tone ?? POS.ink }}>{value}</span>
      </span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[11.5px] font-semibold" style={{ color: POS.inkSoft }}>{label}</p>
      {children}
    </div>
  );
}

function Text({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg px-3 py-2.5 text-[13px] focus:outline-none"
      style={{ border: `1px solid ${POS.line}`, color: POS.ink }}
    />
  );
}
