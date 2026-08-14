"use client";

import { useEffect } from "react";
import { Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";

/**
 * The toolbar above the invoice, and the only part of the page that is not
 * printed. `?print=1` opens the dialog straight away, so the Print action on
 * the orders board is one click rather than two.
 */
export default function PrintButton({ autoPrint }: { autoPrint?: boolean }) {
  useEffect(() => {
    if (!autoPrint) return;
    // After paint, so the logo is on screen before the dialog snapshots it.
    const id = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(id);
  }, [autoPrint]);

  return (
    <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-5 py-3 print:hidden">
      <Link
        href="/admin/live-orders"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-800"
      >
        <ArrowLeft size={16} />
        Back to orders
      </Link>
      <button
        onClick={() => window.print()}
        className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white"
        style={{ background: "#ea580c" }}
      >
        <Printer size={15} />
        Print invoice
      </button>
    </div>
  );
}
