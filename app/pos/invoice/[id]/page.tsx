import { notFound } from "next/navigation";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { getBranding } from "@/lib/branding";
import { getInvoiceSettings } from "@/lib/invoice-settings-server";
import { toInvoiceOrder } from "@/lib/invoice";
import InvoiceSheet from "@/components/admin/InvoiceSheet";
import ThermalReceipt, { ROLL_WIDTH_MM } from "@/components/pos/ThermalReceipt";
import { getPosSettings } from "@/lib/pos/menu-server";
import { posOrderCode } from "@/lib/pos/cart";
import { requireStaff } from "@/lib/pos/guard";
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
 *
 * Prints to an 80mm roll by default, because that is the printer sitting next
 * to the till. `?format=a4` gives the full-page tax invoice instead, for the
 * customer who wants one for their company — the same sheet the admin panel
 * prints, so the two never disagree.
 */
export default async function PosInvoicePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { print?: string; format?: string };
}) {
  const a4 = searchParams.format === "a4";
  await requireStaff();

  const [orderRes, settings, branding, posSettings] = await Promise.all([
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
    getPosSettings(),
  ]);

  if (orderRes.error || !orderRes.data) notFound();

  const row = orderRes.data as unknown as Record<string, unknown>;
  const order = toInvoiceOrder(row);

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      {/*
        The page size is the paper. Naming the roll width in @page is what stops
        the driver treating it as A4 and printing a receipt down the left third
        of a page it then feeds and cuts blank. Zero margins suppress the
        browser's own header and footer — the title, the date and the URL, none
        of which belong on a customer's receipt.
      */}
      <style>{`
        @media print {
          @page { size: ${a4 ? "auto" : `${ROLL_WIDTH_MM}mm auto`}; margin: 0; }
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
          /* Thermal heads are one colour. Anything relying on a light grey to
             separate two things has to keep it when the browser stops adjusting. */
          .thermal { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <PrintBar autoPrint={searchParams.print === "1"} orderId={params.id} a4={a4} />

      {a4 ? (
        <div className="mx-auto max-w-[820px] p-4 print:p-0">
          <InvoiceSheet order={order} settings={settings} fallbackLogo={branding.logoUrl} />
        </div>
      ) : (
        <div className="flex justify-center p-4 print:p-0">
          <div className="bg-white shadow-sm print:shadow-none">
            <ThermalReceipt
              order={order}
              settings={settings}
              logoUrl={branding.logoUrl}
              orderCode={posOrderCode(posSettings.order_prefix, order.order_number)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
