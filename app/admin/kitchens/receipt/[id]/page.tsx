import { notFound } from "next/navigation";
import ThermalReceipt, { ROLL_WIDTH_MM } from "@/components/pos/ThermalReceipt";
import { getBranding } from "@/lib/branding";
import { getInvoiceSettings } from "@/lib/invoice-settings-server";
import { receiptFromKitchenOrder, type KitchenOrderForReceipt } from "@/lib/kitchen-orders";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import ReceiptBar from "./ReceiptBar";

export const dynamic = "force-dynamic";

/** An 80mm receipt for a /kitchens order, on the same template as the till's. */
export default async function KitchenReceiptPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { print?: string; embed?: string; popup?: string };
}) {
  const [{ data }, settings, branding] = await Promise.all([
    supabaseAdminLive.from("kitchen_orders").select("*").eq("id", params.id).maybeSingle(),
    getInvoiceSettings(),
    getBranding(),
  ]);
  if (!data) notFound();

  const raw = data as KitchenOrderForReceipt;
  const order = receiptFromKitchenOrder(raw);

  return (
    <div className="print-sheet min-h-screen bg-gray-100 print:bg-white">
      <style>{`
        @media print {
          @page { size: ${ROLL_WIDTH_MM}mm auto; margin: 0; }
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; width: ${ROLL_WIDTH_MM}mm !important; }
          .thermal { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      {searchParams.embed !== "1" && (
        <ReceiptBar autoPrint={searchParams.print === "1"} popup={searchParams.popup === "1"} />
      )}

      <div className="print-sheet flex justify-center p-4 print:p-0">
        <div className="bg-white shadow-sm print:shadow-none">
          <ThermalReceipt
            order={order}
            settings={settings}
            logoUrl={branding.logoUrl}
            orderCode={`KIT-${raw.order_number}`}
            sourceLabel={raw.waiter_name ? `Waiter: ${raw.waiter_name}` : "Kitchens"}
            footerNote={raw.status === "cancelled" ? "CANCELLED" : !raw.paid_at && raw.payment_method === "credit" ? "ON CREDIT" : undefined}
          />
        </div>
      </div>
    </div>
  );
}
