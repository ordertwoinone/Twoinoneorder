import { notFound } from "next/navigation";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { getBranding } from "@/lib/branding";
import { getInvoiceSettings } from "@/lib/invoice-settings-server";
import { toInvoiceOrder, type InvoiceOrder } from "@/lib/invoice";
import InvoiceSheet from "@/components/admin/InvoiceSheet";
import ThermalReceipt, { ROLL_WIDTH_MM } from "@/components/pos/ThermalReceipt";
import { requireStaff } from "@/lib/pos/guard";
import { KITCHEN_TYPES, sourceOrderCode } from "@/lib/order-source";
import { orderSourceFor } from "@/lib/order-source-server";
import { isWebsiteBoardId, websiteInvoiceOrder } from "@/lib/pos/website-orders";
import { describeOrderSource } from "@/lib/order-source";
import PrintBar from "./PrintBar";

export const dynamic = "force-dynamic";

type BookingRow = Record<string, unknown>;

/**
 * One order out of `bookings`, or null.
 *
 * `*`, because the invoice columns arrive with a hand-run migration and a named
 * list would fail the whole page on a database without them. Scoped to the
 * three kinds of order the branch cooks, so a till session cannot print a table
 * booking's invoice by guessing at its id.
 */
async function bookingRow(id: string): Promise<BookingRow | null> {
  const { data, error } = await supabaseAdminLive
    .from("bookings")
    .select("*")
    .eq("id", id)
    .in("type", KITCHEN_TYPES as unknown as string[])
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as BookingRow;
}

/**
 * One order's receipt, printed from the till.
 *
 * The same InvoiceSheet the admin panel prints, so a receipt handed over the
 * counter and one reprinted from Order History a week later are the same
 * document — and the wording stays editable in one place, admin → Invoice.
 *
 * Its own route rather than reusing /admin/invoice: that one is behind admin
 * middleware, and a cashier has a till session, not an admin account. Scoped to
 * the three kinds of order the branch actually cooks — counter, kiosk and
 * website — so a POS session cannot print a table booking's invoice by guessing
 * at its id.
 *
 * Prints to an 80mm roll by default, because that is the printer sitting next
 * to the till. `?format=a4` gives the full-page tax invoice instead, for the
 * customer who wants one for their company — the same sheet the admin panel
 * prints, so the two never disagree.
 *
 * A website order is fetched from take.app's table rather than from bookings,
 * because that is where it lives. Its ticket is what the kitchen puts on the
 * rail; the tax invoice for one is the storefront's, not ours.
 */
export default async function PosInvoicePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { print?: string; format?: string; embed?: string; popup?: string };
}) {
  const a4 = searchParams.format === "a4";
  /* Rendered inside a hidden iframe by lib/print-document: no toolbar to show,
     and the parent fires the print so this must not fire a second one. */
  const embedded = searchParams.embed === "1";
  await requireStaff();

  // Decoded, because a website order's id carries a colon the board encoded.
  const id = decodeURIComponent(params.id);
  const website = isWebsiteBoardId(id);

  const [found, settings, branding] = await Promise.all([
    website ? websiteInvoiceOrder(id) : bookingRow(id),
    getInvoiceSettings(),
    getBranding(),
  ]);

  if (!found) notFound();

  /* A website order is already in the shape the templates print; a booking is
     a database row that has to be read into one. */
  const order = website ? (found as InvoiceOrder) : toInvoiceOrder(found as BookingRow);

  /* Which panel, which cashier, or the website — and the prefix that issued
     this order's number, which is not the till's for the other two. */
  const source = website
    ? describeOrderSource({ type: "website" })
    : await orderSourceFor(found as BookingRow);

  return (
    <div className="print-sheet min-h-screen bg-gray-100 print:bg-white">
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
          ${a4 ? "" : `
          /* The width again, in the document itself.

             Android's print service picks the paper from its own dialog and
             frequently ignores @page size altogether. When it does, a receipt
             laid out for whatever sheet it chose prints at the wrong scale or
             off the edge; pinning the body to the roll width means the worst
             case is a narrow column on a wide page rather than a lost receipt. */
          html, body { width: ${ROLL_WIDTH_MM}mm !important; }
          `}
          /* Thermal heads are one colour. Anything relying on a light grey to
             separate two things has to keep it when the browser stops adjusting. */
          .thermal { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      {!embedded && (
        <PrintBar
          autoPrint={searchParams.print === "1"}
          popup={searchParams.popup === "1"}
          orderId={params.id}
          a4={a4}
        />
      )}

      {a4 ? (
        <div className="print-sheet mx-auto max-w-[820px] p-4 print:p-0">
          <InvoiceSheet
            order={order}
            settings={settings}
            fallbackLogo={branding.logoUrl}
            sourceLabel={source.label}
          />
        </div>
      ) : (
        <div className="print-sheet flex justify-center p-4 print:p-0">
          <div className="bg-white shadow-sm print:shadow-none">
            <ThermalReceipt
              order={order}
              settings={settings}
              logoUrl={branding.logoUrl}
              orderCode={sourceOrderCode(source, order.order_number)}
              sourceLabel={source.label}
            />
          </div>
        </div>
      )}
    </div>
  );
}
