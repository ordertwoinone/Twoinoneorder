import { notFound, redirect } from "next/navigation";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { getBranding } from "@/lib/branding";
import { getInvoiceSettings } from "@/lib/invoice-settings-server";
import { toInvoiceOrder } from "@/lib/invoice";
import InvoiceSheet from "@/components/admin/InvoiceSheet";
import { currentStaff } from "@/lib/pos/auth";
import PrintBar from "./PrintBar";

export const dynamic = "force-dynamic";

/**
 * One order's receipt, printed from the till.
 *
 * The same InvoiceSheet the admin panel prints, so a receipt handed over the
 * counter and one reprinted from Order History a week later are the same
 * document — and the wording stays editable in one place, admin → Invoice.
 *
 * Its own route rather than reusing /admin/invoice: that one is behind admin
 * middleware, and a cashier has a till session, not an admin account. Scoped to
 * orders the till is responsible for, so a POS session cannot print a table
 * booking's invoice by guessing at its id.
 */
export default async function PosInvoicePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { print?: string };
}) {
  const staff = await currentStaff();
  if (!staff) redirect("/pos/login");

  const [orderRes, settings, branding] = await Promise.all([
    supabaseAdminLive
      // `*`, because the invoice columns arrive with a hand-run migration and a
      // named list would fail the whole page on a database without them.
      .from("bookings")
      .select("*")
      .eq("id", params.id)
      .in("type", ["pos", "kiosk"])
      .maybeSingle(),
    getInvoiceSettings(),
    getBranding(),
  ]);

  if (orderRes.error || !orderRes.data) notFound();

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      {/* Zero page margins suppress the browser's own header and footer — the
          page title, the date and the URL it otherwise prints at the edges. */}
      <style>{`
        @media print {
          @page { size: auto; margin: 0; }
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
        }
      `}</style>

      <PrintBar autoPrint={searchParams.print === "1"} />

      <div className="mx-auto max-w-[820px] p-4 print:p-0">
        <InvoiceSheet
          order={toInvoiceOrder(orderRes.data as unknown as Record<string, unknown>)}
          settings={settings}
          fallbackLogo={branding.logoUrl}
        />
      </div>
    </div>
  );
}
