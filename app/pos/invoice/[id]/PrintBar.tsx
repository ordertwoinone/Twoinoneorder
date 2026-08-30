"use client";

import { useEffect } from "react";
import { ArrowLeft, Printer } from "lucide-react";
import { useRouter } from "next/navigation";
import { POS } from "@/lib/pos/theme";

/**
 * The bar above the receipt, and the only part of the page that is not printed.
 *
 * `?print=1` opens the dialog on arrival, so printing from the till is one tap
 * rather than two — which matters with a customer waiting at the counter.
 */
export default function PrintBar({ autoPrint }: { autoPrint?: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!autoPrint) return;
    // After paint, so the logo is on screen before the dialog snapshots it.
    const id = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(id);
  }, [autoPrint]);

  return (
    <div
      className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-white px-5 py-3 print:hidden"
      style={{ borderBottom: `1px solid ${POS.line}` }}
    >
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-sm font-semibold"
        style={{ color: POS.inkSoft }}
      >
        <ArrowLeft size={16} />
        Back
      </button>
      <button
        onClick={() => window.print()}
        className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white"
        style={{ background: POS.action }}
      >
        <Printer size={15} />
        Print
      </button>
    </div>
  );
}
