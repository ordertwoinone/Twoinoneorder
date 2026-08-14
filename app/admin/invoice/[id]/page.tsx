import { notFound } from "next/navigation";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { getBranding } from "@/lib/branding";
import { getInvoiceSettings } from "@/lib/invoice-settings-server";
import { toInvoiceOrder } from "@/lib/invoice";
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
      <PrintButton autoPrint={searchParams.print === "1"} />

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
