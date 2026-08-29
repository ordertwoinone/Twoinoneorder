export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { insertRow } from "@/lib/admin-write";
import { getAddonGroupsByItem } from "@/lib/kalba/addons-server";
import { addonSummary, type AddonSelection } from "@/lib/kalba/addons";
import { STUDENT_DISCOUNT_PERCENT, type StudentCard } from "@/lib/student-card";
import { findPrivilegeCard } from "@/lib/kiosk/privilege";
import { kioskTotals } from "@/lib/kiosk/cart";
import { kioskOrderCode, DEFAULT_KIOSK_SETTINGS, type KioskItem } from "@/lib/kiosk/types";

/** Only these may be asked for; anything else in the list is ignored. */
const RECEIPT_CHANNELS = ["sms", "whatsapp"] as const;

interface OrderBody {
  /** itemId → how many. The only thing the screen gets to decide. */
  qty?: Record<string, number>;
  addons?: AddonSelection;
  phone?: string;
  privilegeCode?: string;
  receiptChannels?: string[];
}

/**
 * Places an order taken at the kiosk.
 *
 * Everything that decides money is worked out here, from the database: the
 * screen sends what was chosen, never what it costs. A kiosk stands unattended
 * in a public room, so a payload claiming a two-dirham burger and a 90% card
 * has to be worth nothing.
 *
 * The order is stored as an ordinary booking with type 'kiosk', which is what
 * puts it on the live board, in Order History and on the same tax invoice as
 * every other order rather than in a ledger of its own.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as OrderBody;

  const wanted = Object.entries(body.qty ?? {})
    .map(([id, n]) => [id, Math.floor(Number(n) || 0)] as const)
    // A kiosk basket is a handful of dishes; anything else is not a customer.
    .filter(([, n]) => n > 0 && n <= 50)
    /* Only well-formed ids reach the query. Postgres rejects the whole `.in()`
       on one unparseable uuid, so a single junk key would otherwise fail a
       basket that was perfectly good apart from it. */
    .filter(([id]) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));

  if (wanted.length === 0) {
    return NextResponse.json({ error: "Your order is empty" }, { status: 400 });
  }

  const [settingsRes, itemsRes, groupsByItem] = await Promise.all([
    supabaseAdmin.from("kiosk_settings").select("*").limit(1).maybeSingle(),
    supabaseAdmin
      .from("kalba_popular_items")
      .select("*")
      .eq("is_active", true)
      .in("id", wanted.map(([id]) => id)),
    getAddonGroupsByItem(),
  ]);

  const settings = { ...DEFAULT_KIOSK_SETTINGS, ...(settingsRes.data ?? {}) };

  if (settings.is_live === false) {
    return NextResponse.json({ error: settings.closed_message }, { status: 409 });
  }

  const items = ((itemsRes.data ?? []) as KioskItem[]).map((item) => ({
    ...item,
    addon_groups: groupsByItem[item.id] ?? [],
  }));

  if (items.length === 0) {
    return NextResponse.json({ error: "Those dishes are no longer available" }, { status: 409 });
  }

  /* Only the ticked options that genuinely belong to the dish are priced. An
     id borrowed from another item, or one that has since been deleted, is
     dropped rather than charged for. */
  const qty: Record<string, number> = {};
  const addons: AddonSelection = {};
  for (const item of items) {
    qty[item.id] = wanted.find(([id]) => id === item.id)?.[1] ?? 0;
    const own = new Set((item.addon_groups ?? []).flatMap((g) => g.options.map((o) => o.id)));
    addons[item.id] = (body.addons?.[item.id] ?? []).filter((id) => own.has(id));
  }

  // The card is looked up again here: the screen's word for it is not evidence.
  const card: StudentCard | null =
    settings.privilege_enabled !== false && body.privilegeCode
      ? await findPrivilegeCard(body.privilegeCode)
      : null;

  const privilegePercent = card ? (card.discount_percent ?? STUDENT_DISCOUNT_PERCENT) : 0;
  const totals = kioskTotals(items, qty, addons, privilegePercent);

  const phone = String(body.phone ?? "").trim().slice(0, 32);
  const channels = (body.receiptChannels ?? []).filter(
    (c): c is (typeof RECEIPT_CHANNELS)[number] => RECEIPT_CHANNELS.includes(c as never),
  );

  /* The note is what staff read on the live board, so it stays English and
     says the three things they act on: it came from the kiosk, what is in it,
     and what it came to. */
  const itemsText = totals.lines
    .map((l) => {
      const extras = addonSummary(l.groups, addons[l.item.id], (a) => a.name);
      return `${l.item.name} x${l.qty}${extras ? ` (+ ${extras})` : ""}`;
    })
    .join(", ");

  const { data, error } = await insertRow("bookings", {
    type: "kiosk",
    table_section: settings.pickup_counter,
    guest_name: card?.full_name ?? "",
    phone,
    guests: 1,
    status: "pending",
    order_type: "Pickup",
    /* Nobody has paid yet — the money changes hands at the counter when the
       food is collected. Stated rather than left to the column default, which
       on databases that have not re-run order_invoices.sql is still 'cash' and
       would book every kiosk order as settled the moment it was placed. */
    payment_method: "pending",
    notes: `Kiosk order · ${itemsText} · Total: AED ${totals.total.toFixed(2)}${card ? ` · Privilege ${card.member_id}` : ""}`,
    items: totals.lines.map((l) => ({
      name: l.item.name,
      qty: l.qty,
      unit_price: l.netPrice,
      extras: addonSummary(l.groups, addons[l.item.id], (a) => a.name),
      extras_price: l.extrasPrice,
      line_total: l.lineTotal,
    })),
    // VAT is already inside the price here, as it is everywhere else on the site.
    subtotal: Number((totals.total - totals.vat).toFixed(2)),
    discount_total: totals.totalSaved,
    tax_amount: totals.vat,
    total_amount: totals.total,
    receipt_channels: channels,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const row = data as { id: string; order_number?: number | null } | null;

  return NextResponse.json(
    {
      id: row?.id ?? null,
      order_number: row?.order_number ?? null,
      code: kioskOrderCode(settings.order_prefix, row?.order_number),
      total: totals.total,
      count: totals.count,
      privilege: card ? { member_id: card.member_id, percent: privilegePercent } : null,
      discount: totals.privilegeDiscount,
      saved: totals.totalSaved,
      ready_minutes: [settings.ready_minutes_min, settings.ready_minutes_max],
      pickup_counter: settings.pickup_counter,
    },
    { status: 201 },
  );
}
