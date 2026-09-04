export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { insertRow } from "@/lib/admin-write";
import { getAddonGroupsByItem } from "@/lib/kalba/addons-server";
import { addonSummary, type AddonSelection } from "@/lib/kalba/addons";
import { STUDENT_DISCOUNT_PERCENT, type StudentCard } from "@/lib/student-card";
import { findPrivilegeCard } from "@/lib/kiosk/privilege";
import { kioskTotals } from "@/lib/kiosk/cart";
import {
  deviceLabel,
  kioskOrderCode,
  DEFAULT_KIOSK_SETTINGS,
  type KioskItem,
} from "@/lib/kiosk/types";
import { getKioskDevice, sellable } from "@/lib/kiosk/server";

/** Only these may be asked for; anything else in the list is ignored. */
const RECEIPT_CHANNELS = ["sms", "whatsapp"] as const;

interface OrderBody {
  /** itemId → how many. The only thing the screen gets to decide. */
  qty?: Record<string, number>;
  addons?: AddonSelection;
  phone?: string;
  privilegeCode?: string;
  receiptChannels?: string[];
  /** Which panel sent this, from its URL. Resolved here, never trusted as-is. */
  deviceSlug?: string;
  /** 'pickup' or 'delivery'. Anything else is treated as collection. */
  fulfilment?: string;
  /** itemId → what the customer asked about that dish. */
  notes?: Record<string, string>;
  /** One note for the whole ticket. */
  orderNote?: string;
}

/**
 * A note, as it is allowed to reach a kitchen ticket.
 *
 * Trimmed, capped, and stripped of anything that is not a printable line. The
 * cap matters more than it looks: this text is printed on 80mm paper and shown
 * on a board, and a customer holding a key down on the on-screen keyboard could
 * otherwise push a ticket to several feet of receipt. Newlines go too — a note
 * is one line under a dish, and a "note" containing twenty of them is a way to
 * push the total off the bottom of the printed bill.
 */
function cleanNote(input: unknown, max: number): string {
  return String(input ?? "")
    // Newlines, tabs and runs of space all collapse to one space.
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/** Matches the caps the kiosk sheet enforces on screen. */
const ITEM_NOTE_MAX = 120;
const ORDER_NOTE_MAX = 300;

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

  /* Same rule the screen applies, applied again here. A tab left open from
     before a dish lost its price would otherwise still be able to order it. */
  const items = ((itemsRes.data ?? []) as KioskItem[])
    .filter((item) => sellable(item))
    .map((item) => ({ ...item, addon_groups: groupsByItem[item.id] ?? [] }));

  if (items.length === 0) {
    return NextResponse.json({ error: "Those dishes are no longer available" }, { status: 409 });
  }

  /* Only the ticked options that genuinely belong to the dish are priced. An
     id borrowed from another item, or one that has since been deleted, is
     dropped rather than charged for. */
  const qty: Record<string, number> = {};
  const addons: AddonSelection = {};
  /* Keyed by the dishes actually being ordered, so a note against an id that
     is not in the basket — a dish removed after the note was written, or a
     key invented by hand — is dropped rather than carried onto the ticket. */
  const itemNotes: Record<string, string> = {};
  for (const item of items) {
    qty[item.id] = wanted.find(([id]) => id === item.id)?.[1] ?? 0;
    const own = new Set((item.addon_groups ?? []).flatMap((g) => g.options.map((o) => o.id)));
    addons[item.id] = (body.addons?.[item.id] ?? []).filter((id) => own.has(id));
    itemNotes[item.id] = cleanNote(body.notes?.[item.id], ITEM_NOTE_MAX);
  }

  const orderNote = cleanNote(body.orderNote, ORDER_NOTE_MAX);

  // The card is looked up again here: the screen's word for it is not evidence.
  const card: StudentCard | null =
    settings.privilege_enabled !== false && body.privilegeCode
      ? await findPrivilegeCard(body.privilegeCode)
      : null;

  /* The screen sends its slug; the label written on the order comes from the
     device row, not from the payload. A panel switched off in admin is refused
     here as well as on screen, so a stale tab cannot keep sending orders from a
     kiosk that has been taken out of service. */
  const device = await getKioskDevice(body.deviceSlug);
  if (device && device.is_active === false) {
    return NextResponse.json({ error: settings.closed_message }, { status: 409 });
  }

  const privilegePercent = card ? (card.discount_percent ?? STUDENT_DISCOUNT_PERCENT) : 0;

  /* Collection or delivery, and that is the whole of it. No address and no
     charge: the branch calls the number above to arrange where it goes, so
     what the order has to carry is which of the two it is. */
  const delivering = body.fulfilment === "delivery";

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
      const note = itemNotes[l.item.id];
      /* The note goes in the summary line too, in quotes. Anywhere this order
         is read as prose rather than as a row of fields — a legacy screen, a
         copied WhatsApp message — that line is all there is, and a request the
         customer made must not be the thing that falls out of it. */
      return `${l.item.name} x${l.qty}${extras ? ` (+ ${extras})` : ""}${note ? ` [“${note}”]` : ""}`;
    })
    .join(", ");

  const { data, error } = await insertRow("bookings", {
    type: "kiosk",
    kiosk_device_id: device?.id ?? null,
    /* The live board already prints table_section as the "where" column, so
       putting the panel's name there makes every existing screen — the board,
       Order History, the invoice — say which kiosk took it, with no change to
       any of them. Copied rather than joined: retiring a panel must not blank
       out the orders it took. */
    table_section: device ? deviceLabel(device) : settings.pickup_counter,
    guest_name: card?.full_name ?? "",
    phone,
    guests: 1,
    status: "pending",
    order_type: delivering ? "Delivery" : "Pickup",
    /* Nobody has paid yet — the money changes hands at the counter when the
       food is collected. Stated rather than left to the column default, which
       on databases that have not re-run order_invoices.sql is still 'cash' and
       would book every kiosk order as settled the moment it was placed. */
    payment_method: "pending",
    notes: [
      `Kiosk order${device ? ` (${deviceLabel(device)})` : ""}`,
      delivering ? "DELIVERY" : "Pickup",
      itemsText,
      `Total: AED ${totals.total.toFixed(2)}`,
      card ? `Privilege ${card.member_id}` : "",
      orderNote ? `Note: ${orderNote}` : "",
    ]
      .filter(Boolean)
      .join(" · "),
    /* Its own column as well as inside the note above, so the board and the
       receipt can draw it as a box rather than the kitchen having to find it
       in the middle of a sentence about panels and totals. */
    customer_note: orderNote,
    items: totals.lines.map((l) => ({
      name: l.item.name,
      qty: l.qty,
      unit_price: l.netPrice,
      extras: addonSummary(l.groups, addons[l.item.id], (a) => a.name),
      extras_price: l.extrasPrice,
      line_total: l.lineTotal,
      // "No onions" — an instruction, not something being charged for.
      note: itemNotes[l.item.id],
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
      fulfilment: delivering ? "delivery" : "pickup",
      device: device ? { slug: device.slug, label: deviceLabel(device) } : null,
    },
    { status: 201 },
  );
}
