"use client";

import { useEffect } from "react";
import { ArrowLeft, FileText, Printer, ReceiptText } from "lucide-react";
import { useRouter } from "next/navigation";
import { POS } from "@/lib/pos/theme";

/**
 * The bar above the receipt, and the only part of the page that is not printed.
 *
 * `?print=1` opens the dialog on arrival, so printing from the till is one tap
 * rather than two — which matters with a customer waiting at the counter.
 * `?popup=1` says this window was opened purely to be printed — the Android
 * path in lib/print-document.ts, where an iframe prints blank — so it closes
 * itself once the dialog is done rather than becoming another stray tab.
 *
 * The format toggle is here rather than in settings because it is a per-customer
 * decision, not a per-branch one: the roll is what almost everybody gets, and
 * the A4 tax invoice is for the one in twenty who asks for something their
 * company will accept.
 */
export default function PrintBar({
  autoPrint,
  popup,
  orderId,
  a4,
}: {
  autoPrint?: boolean;
  /** Opened by the print helper, so it should close itself afterwards. */
  popup?: boolean;
  orderId: string;
  a4: boolean;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!autoPrint) return;
    // After paint, so the logo is on screen before the dialog snapshots it.
    const id = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(id);
  }, [autoPrint]);

  /**
   * Closing the window this opened in, once the dialog is finished with.
   *
   * Only when it was script-opened: a window that was not opened by script
   * cannot close itself, and a cashier who reached this page by tapping a link
   * would be startled by the tab vanishing under them.
   *
   * `afterprint` fires on cancel as well as on print, which is what we want —
   * the tab was only ever a vehicle for the dialog either way. Some Android
   * builds skip the event, so a timer closes it regardless.
   */
  useEffect(() => {
    if (!popup || typeof window === "undefined" || !window.opener) return;

    let closed = false;
    const shut = () => {
      if (closed) return;
      closed = true;
      window.close();
    };

    window.addEventListener("afterprint", shut, { once: true });
    const id = window.setTimeout(shut, 60_000);
    return () => {
      window.removeEventListener("afterprint", shut);
      window.clearTimeout(id);
    };
  }, [popup]);

  return (
    <div
      className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-white px-5 py-3 print:hidden"
      style={{ borderBottom: `1px solid ${POS.line}` }}
    >
      <button
        onClick={() => (popup && window.opener ? window.close() : router.back())}
        className="inline-flex items-center gap-1.5 text-sm font-semibold"
        style={{ color: POS.inkSoft }}
      >
        <ArrowLeft size={16} />
        Back
      </button>

      <div className="flex items-center gap-2">
        <a
          href={`/pos/invoice/${orderId}${a4 ? "" : "?format=a4"}`}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-[13px] font-semibold"
          style={{ border: `1px solid ${POS.line}`, color: POS.ink }}
        >
          {a4 ? <ReceiptText size={15} /> : <FileText size={15} />}
          {a4 ? "80mm receipt" : "A4 invoice"}
        </a>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white"
          style={{ background: POS.action }}
        >
          <Printer size={15} />
          Print {a4 ? "A4" : "receipt"}
        </button>
      </div>
    </div>
  );
}
