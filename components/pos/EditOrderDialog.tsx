"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Undo2, X } from "lucide-react";
import { POS } from "@/lib/pos/theme";
import { aed } from "@/lib/pos/cart";
import { isPaid, lineValue, type OrderLine } from "@/lib/pos/amend";

/**
 * Taking dishes off an order that has already been rung up.
 *
 * The dialog previews exactly what the server is about to do, using the same
 * arithmetic the server uses (lib/pos/amend.ts) — so the number on the confirm
 * button is the number that will be handed back, not an estimate of it.
 *
 * Which of the two things is happening is stated in words at the top, because
 * they look identical and are not:
 *
 *   Unpaid — the order simply gets smaller and the customer pays less.
 *   Paid   — the charge stands and the difference is given back as a refund.
 *
 * A cashier who thinks they are editing when they are refunding is a cashier
 * about to hand money to somebody who has not paid yet.
 */
export default function EditOrderDialog({
  code,
  items,
  paymentMethod,
  refundedTotal,
  /** The kitchen has to agree first, because this ticket is still being cooked. */
  needsKitchen,
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  code: string;
  items: OrderLine[];
  paymentMethod: string | null;
  refundedTotal: number;
  needsKitchen: boolean;
  busy: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: (input: { cancelIndexes: number[]; cancelOrder: boolean; reason: string }) => void;
}) {
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [reason, setReason] = useState("");

  const paid = isPaid(paymentMethod);

  /* Only lines still standing can be taken off. One already cancelled is shown
     struck through so the dialog matches the receipt, but it cannot be picked
     — selecting it again would be a second refund for the same dish. */
  const rows = items.map((line, index) => ({ line, index }));
  const standing = rows.filter((r) => !r.line.cancelled);

  const removing = useMemo(
    () => rows.filter((r) => picked.has(r.index)).reduce((sum, r) => sum + lineValue(r.line), 0),
    [picked, rows],
  );

  const wholeOrder = picked.size > 0 && picked.size === standing.length;

  function toggle(index: number) {
    setPicked((p) => {
      const next = new Set(p);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(0,0,0,0.5)" }}
    >
      <div className="flex max-h-[88vh] w-full max-w-[520px] flex-col rounded-2xl bg-white">
        <div
          className="flex shrink-0 items-center justify-between px-5 py-4"
          style={{ borderBottom: `1px solid ${POS.line}` }}
        >
          <div>
            <h2 className="text-lg font-black" style={{ color: POS.ink }}>Edit {code}</h2>
            <p className="text-[12px]" style={{ color: POS.inkSoft }}>
              {paid
                ? "Paid — anything taken off is refunded."
                : "Not paid yet — anything taken off just comes off the bill."}
            </p>
          </div>
          <button
            onClick={onCancel}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: POS.page, color: POS.ink }}
          >
            <X size={17} />
          </button>
        </div>

        <div className="pos-scroll flex-1 px-5 py-3">
          {needsKitchen && (
            <p
              className="mb-3 flex items-start gap-2 rounded-lg px-3 py-2.5 text-[12.5px] font-semibold"
              style={{ background: "#FFFBEB", color: "#92400E" }}
            >
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              <span>
                This ticket is still being cooked, so the kitchen has to agree. Nothing is
                refunded until they accept it.
              </span>
            </p>
          )}

          {rows.map(({ line, index }) => {
            const gone = Boolean(line.cancelled);
            const asked = Boolean(line.cancel_requested);
            const on = picked.has(index);
            return (
              <button
                key={index}
                onClick={() => !gone && toggle(index)}
                disabled={gone}
                className="mb-1.5 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start disabled:opacity-55"
                style={{
                  border: `1px solid ${on ? POS.bad : POS.line}`,
                  background: on ? POS.badSoft : "#fff",
                }}
              >
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded"
                  style={{
                    border: `2px solid ${on ? POS.bad : "#D4D4D8"}`,
                    background: on ? POS.bad : "#fff",
                  }}
                >
                  {on && <X size={12} strokeWidth={4} color="#fff" />}
                </span>

                <span className="min-w-0 flex-1">
                  <span
                    className="block truncate text-[13.5px] font-bold"
                    style={{
                      color: gone ? POS.inkSoft : POS.ink,
                      textDecoration: gone ? "line-through" : "none",
                    }}
                  >
                    {line.qty ?? 1}× {line.name || "Item"}
                  </span>
                  {line.extras && (
                    <span className="block truncate text-[11.5px]" style={{ color: POS.inkSoft }}>
                      {line.extras}
                    </span>
                  )}
                  {gone && (
                    <span className="block text-[11px] font-semibold" style={{ color: POS.bad }}>
                      already taken off
                    </span>
                  )}
                  {asked && !gone && (
                    <span className="block text-[11px] font-semibold" style={{ color: POS.warn }}>
                      waiting on the kitchen
                    </span>
                  )}
                </span>

                <span
                  className="shrink-0 text-[13px] font-bold"
                  style={{ color: gone ? POS.inkSoft : POS.ink }}
                >
                  {aed(lineValue(line))}
                </span>
              </button>
            );
          })}

          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (optional)"
            className="mt-2 w-full rounded-lg px-3 py-2.5 text-[13px] focus:outline-none"
            style={{ border: `1px solid ${POS.line}`, color: POS.ink }}
          />

          {refundedTotal > 0 && (
            <p className="mt-2 text-[12px]" style={{ color: POS.inkSoft }}>
              {aed(refundedTotal)} has already been refunded on this order.
            </p>
          )}

          {error && (
            <p
              className="mt-2 rounded-lg px-3 py-2.5 text-[12px] font-semibold"
              style={{ background: POS.badSoft, color: POS.bad }}
            >
              {error}
            </p>
          )}
        </div>

        <div
          className="shrink-0 px-5 py-4"
          style={{ borderTop: `1px solid ${POS.line}` }}
        >
          {picked.size > 0 && (
            <div
              className="mb-3 flex items-baseline justify-between rounded-xl px-3 py-2.5"
              style={{ background: POS.page }}
            >
              <span className="text-[12.5px] font-bold" style={{ color: POS.ink }}>
                {wholeOrder ? "Cancelling the whole order" : `${picked.size} line${picked.size === 1 ? "" : "s"} off`}
              </span>
              <span className="text-lg font-black" style={{ color: paid ? POS.bad : POS.ink }}>
                {paid ? `Refund ${aed(removing)}` : `− ${aed(removing)}`}
              </span>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={onCancel}
              disabled={busy}
              className="rounded-xl px-5 text-sm font-bold disabled:opacity-40"
              style={{ background: POS.page, color: POS.ink, height: 48 }}
            >
              Close
            </button>
            <button
              onClick={() =>
                onConfirm({
                  cancelIndexes: Array.from(picked),
                  /* Told explicitly rather than inferred from the count, so an
                     order whose every line is picked is cancelled outright
                     instead of left as a ticket with nothing on it. */
                  cancelOrder: wholeOrder,
                  reason,
                })
              }
              disabled={busy || picked.size === 0}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl text-[15px] font-bold text-white disabled:opacity-40"
              style={{ background: paid ? POS.bad : POS.night, height: 48 }}
            >
              <Undo2 size={16} />
              {busy
                ? "Working…"
                : needsKitchen
                  ? "Ask the kitchen"
                  : paid
                    ? `Refund ${aed(removing)}`
                    : "Take off the order"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
