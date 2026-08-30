export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { insertRow } from "@/lib/admin-write";
import { addonSummary, type AddonSelection } from "@/lib/kalba/addons";
import { getLiveAddonGroupsByItem } from "@/lib/kalba/addons-server";
import { sellable } from "@/lib/kiosk/server";
import type { KioskItem } from "@/lib/kiosk/types";
import { currentStaff } from "@/lib/pos/auth";
import { openShiftFor } from "@/lib/pos/shift-server";
import { getPosSettings } from "@/lib/pos/menu-server";
import {
  ORDER_TYPE_LABEL,
  posOrderCode,
  posTotals,
  type PosDiscount,
  type PosOrderType,
  type PosPayment,
} from "@/lib/pos/cart";

/**
 * Ringing up an order at the till.
 *
 * Priced here, from the database, exactly as the kiosk order route is — the
 * screen says what was chosen, never what it costs. The till is trusted more
 * than a kiosk (there is a named member of staff signed in behind it) but not
 * so much that a tampered payload should be able to sell a burger for a
 * dirham, and the audit only means something if the figures were the server's.
 *
 * The one thing a till decides that a kiosk cannot is the discount, and that
 * is bounded: a cashier may go up to the configured percentage, and past it a
 * manager has to be the one signed in.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ORDER_TYPES: PosOrderType[] = ["dine_in", "takeaway", "delivery"];
const PAYMENTS: PosPayment[] = ["cash", "card", "online"];

interface OrderBody {
  qty?: Record<string, number>;
  addons?: AddonSelection;
  orderType?: string;
  payment?: string;
  customerName?: string;
  customerPhone?: string;
  address?: string;
  tableId?: string;
  note?: string;
  discount?: PosDiscount | null;
  couponCode?: string;
  /** A held basket being rung up, so it can be cleared once it is a real order. */
  parkedId?: string;
}

export async function POST(request: Request) {
  const staff = await currentStaff();
  if (!staff) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const shift = await openShiftFor(staff.id);
  /* No shift, no sale. Every figure the day-close reconciles is grouped by
     shift, so an order taken outside one would be money with nowhere to land. */
  if (!shift) {
    return NextResponse.json({ error: "Open your shift before taking orders" }, { status: 409 });
  }

  const body = (await request.json().catch(() => ({}))) as OrderBody;

  const wanted = Object.entries(body.qty ?? {})
    .map(([id, n]) => [id, Math.floor(Number(n) || 0)] as const)
    .filter(([id, n]) => n > 0 && n <= 200 && UUID.test(id));

  if (wanted.length === 0) {
    return NextResponse.json({ error: "The order is empty" }, { status: 400 });
  }

  const orderType: PosOrderType = ORDER_TYPES.includes(body.orderType as PosOrderType)
    ? (body.orderType as PosOrderType)
    : "takeaway";
  const payment: PosPayment = PAYMENTS.includes(body.payment as PosPayment)
    ? (body.payment as PosPayment)
    : "cash";

  const [settings, itemsRes, groupsByItem] = await Promise.all([
    getPosSettings(),
    supabaseAdminLive
      .from("kalba_popular_items")
      .select("*")
      .eq("is_active", true)
      .in("id", wanted.map(([id]) => id)),
    getLiveAddonGroupsByItem(),
  ]);

  const items = ((itemsRes.data ?? []) as KioskItem[])
    .filter((item) => sellable(item))
    .map((item) => ({ ...item, addon_groups: groupsByItem[item.id] ?? [] }));

  if (items.length === 0) {
    return NextResponse.json({ error: "Those items are no longer on the menu" }, { status: 409 });
  }

  // Only options that genuinely belong to their dish are priced.
  const qty: Record<string, number> = {};
  const addons: AddonSelection = {};
  for (const item of items) {
    qty[item.id] = wanted.find(([id]) => id === item.id)?.[1] ?? 0;
    const own = new Set((item.addon_groups ?? []).flatMap((g) => g.options.map((o) => o.id)));
    addons[item.id] = (body.addons?.[item.id] ?? []).filter((id) => own.has(id));
  }

  /* A cashier's discount is capped; a manager's is not. Checked against the
     role on the session, not anything the screen claimed about itself. */
  const discount = body.discount ?? null;
  if (discount && discount.value > 0 && staff.role !== "manager") {
    const asPercent =
      discount.mode === "percent"
        ? discount.value
        : (() => {
            const food = posTotals({ items, qty, addons, orderType }).itemsTotal;
            return food > 0 ? (discount.value / food) * 100 : 100;
          })();

    if (asPercent > settings.max_cashier_discount_percent) {
      return NextResponse.json(
        {
          error: `A cashier can discount up to ${settings.max_cashier_discount_percent}%. Ask a manager to sign in for more.`,
        },
        { status: 403 },
      );
    }
  }

  // A coupon is worth whatever the coupon table says, never what was sent.
  let couponAmount = 0;
  let couponCode = "";
  if (body.couponCode) {
    const code = String(body.couponCode).toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 40);
    const { data } = await supabaseAdminLive
      .from("kalba_coupons")
      .select("code, discount_type, discount_value, min_order_amount, is_active, expires_at")
      .eq("code", code)
      .eq("is_active", true)
      .maybeSingle();

    const coupon = data as
      | { code: string; discount_type: string; discount_value: number; min_order_amount: number | null; expires_at: string | null }
      | null;

    if (coupon && (!coupon.expires_at || new Date(coupon.expires_at) > new Date())) {
      const food = posTotals({ items, qty, addons, orderType }).itemsTotal;
      if (!coupon.min_order_amount || food >= Number(coupon.min_order_amount)) {
        couponAmount =
          coupon.discount_type === "percentage"
            ? Math.round(((food * Number(coupon.discount_value)) / 100) * 100) / 100
            : Number(coupon.discount_value);
        couponCode = coupon.code;
      }
    }
  }

  const totals = posTotals({
    items,
    qty,
    addons,
    orderType,
    deliveryCharge: settings.delivery_charge,
    freeDeliveryOver: settings.free_delivery_over,
    discount,
    couponAmount,
  });

  const itemsText = totals.lines
    .map((l) => {
      const extras = addonSummary(l.groups, addons[l.item.id], (a) => a.name);
      return `${l.item.name} x${l.qty}${extras ? ` (+ ${extras})` : ""}`;
    })
    .join(", ");

  const address = String(body.address ?? "").trim().slice(0, 400);
  const table = String(body.tableId ?? "").trim().slice(0, 40);
  const staffNote = String(body.note ?? "").trim().slice(0, 500);

  const { data, error } = await insertRow("bookings", {
    type: "pos",
    pos_staff_uuid: staff.id,
    pos_shift_id: shift.id,
    order_type: ORDER_TYPE_LABEL[orderType],
    table_id: orderType === "dine_in" ? table : "",
    table_section: orderType === "dine_in" && table ? `Table ${table}` : ORDER_TYPE_LABEL[orderType],
    guest_name: String(body.customerName ?? "").trim().slice(0, 120),
    phone: String(body.customerPhone ?? "").trim().slice(0, 32),
    guests: 1,
    status: "confirmed",
    /* Rung up means paid, unlike a kiosk order which is settled at collection.
       The cashier picked the method, so it is recorded rather than pending. */
    payment_method: payment,
    notes: [
      `POS ${ORDER_TYPE_LABEL[orderType]} by ${staff.name || staff.staff_id}`,
      itemsText,
      `Total: AED ${totals.total.toFixed(2)}`,
      couponCode ? `Coupon ${couponCode}` : "",
      address ? `Deliver to: ${address}` : "",
      staffNote ? `Note: ${staffNote}` : "",
    ]
      .filter(Boolean)
      .join(" · "),
    items: totals.lines.map((l) => ({
      name: l.item.name,
      qty: l.qty,
      unit_price: l.netPrice,
      extras: addonSummary(l.groups, addons[l.item.id], (a) => a.name),
      extras_price: l.extrasPrice,
      line_total: l.lineTotal,
    })),
    subtotal: Number((totals.total - totals.vat).toFixed(2)),
    discount_total: totals.totalSaved,
    tax_amount: totals.vat,
    total_amount: totals.total,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // The basket is a real order now, so the parked copy of it must not linger.
  if (body.parkedId && UUID.test(body.parkedId)) {
    await supabaseAdminLive.from("pos_parked_orders").delete().eq("id", body.parkedId);
  }

  const row = data as { id: string; order_number?: number | null } | null;

  return NextResponse.json(
    {
      id: row?.id ?? null,
      order_number: row?.order_number ?? null,
      code: posOrderCode(settings.order_prefix, row?.order_number),
      totals: {
        itemsTotal: totals.itemsTotal,
        deliveryCharge: totals.deliveryCharge,
        discount: totals.discount,
        total: totals.total,
        vat: totals.vat,
        count: totals.count,
      },
      payment,
      orderType: ORDER_TYPE_LABEL[orderType],
      coupon: couponCode || null,
    },
    { status: 201 },
  );
}
