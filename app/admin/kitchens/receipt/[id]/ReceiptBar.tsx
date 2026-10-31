"use client";

import { useEffect } from "react";
import { ArrowLeft, Printer } from "lucide-react";
import { useRouter } from "next/navigation";

/**
 * The bar above a receipt, which is not printed. `print=1` opens the dialog on
 * arrival and `popup=1` closes the window afterwards: the Android path in
 * lib/print-document.ts.
 */
export default function ReceiptBar({ autoPrint, popup }: { autoPrint: boolean; popup: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!autoPrint) return;
    const id = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(id);
  }, [autoPrint]);

  useEffect(() => {
    if (!popup || !window.opener) return;
    const shut = () => window.close();
    window.addEventListener("afterprint", shut, { once: true });
    const id = window.setTimeout(shut, 60_000);
    return () => {
      window.removeEventListener("afterprint", shut);
      window.clearTimeout(id);
    };
  }, [popup]);

  return (
    <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-5 py-3 print:hidden">
      <button
        onClick={() => (popup && window.opener ? window.close() : router.back())}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600"
      >
        <ArrowLeft size={16} />
        Back
      </button>
      <button
        onClick={() => window.print()}
        className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white"
        style={{ background: "#ea580c" }}
      >
        <Printer size={15} />
        Print receipt
      </button>
    </div>
  );
}
