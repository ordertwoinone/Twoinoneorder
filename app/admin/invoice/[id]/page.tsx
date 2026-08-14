import { notFound } from "next/navigation";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { getBranding } from "@/lib/branding";
import { getInvoiceSettings } from "@/lib/invoice-settings-server";
import { isReconstructed, toInvoiceOrder } from "@/lib/invoice";
import InvoiceSheet from "@/components/admin/InvoiceSheet";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";

/**
 * One order's tax invoice, laid out to be printed.
 *
 * The sheet itself is the same component the admin editor previews, so what
 * staff see here is what comes out of the printer — a preview that differs from
 * the paper is worse than no preview.
 */

async function getOrder(id: string) {
  const { data, error } = await supabaseAdminLive
    .from("bookings")
    // `*`, because the invoice columns arrive with a hand-run migration and a
    // named list would 404 the whole page on a database without them.
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as Record<string, unknown>;
}

export default async function InvoicePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { print?: string };
}) {
  const [row, settings, branding] = await Promise.all([
    getOrder(params.id),
    getInvoiceSettings(),
    getBranding(),
  ]);

  if (!row) notFound();

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      {/* Zero page margins are what suppress the browser's own header and
          footer — the site title, the date and the URL it prints at the edges.
          The sheet supplies its own padding so nothing sits on the crease. */}
      <style>{`
        @media print {
          @page { size: auto; margin: 0; }
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
        }
      `}</style>

      <PrintButton autoPrint={searchParams.print === "1"} />

      {/* Screen only. An operator has to know the figures were recovered from a
          note before they hand the paper to a customer. */}
      {isReconstructed(row) && (
        <div className="mx-auto mt-4 w-[min(100%,760px)] rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] leading-relaxed text-amber-800 print:hidden">
          <p className="font-semibold">This order was not stored itemised.</p>
          <p className="mt-1">
            It was placed before{" "}
            <code className="font-mono">supabase/order_invoices.sql</code> was run, so there are no
            line items and the total below was read out of the order note. Run that file in the
            Supabase SQL editor and every order taken afterwards will print in full.
          </p>
        </div>
      )}

      <div className="mx-auto my-6 w-[min(100%,760px)] shadow-sm print:my-0 print:w-full print:shadow-none">
        <InvoiceSheet
          order={toInvoiceOrder(row)}
          settings={settings}
          fallbackLogo={branding.logoUrl}
        />
      </div>
    </div>
  );
}

export function generateMetadata({ params }: { params: { id: string } }) {
  return {
    title: `Invoice ${params.id.slice(0, 8)}`,
    robots: { index: false, follow: false },
  };
}
