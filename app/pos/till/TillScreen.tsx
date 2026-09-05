"use client";

import { useMemo, useState } from "react";
import {
  Bike,
  Check,
  ClipboardList,
  CreditCard,
  MessageSquare,
  Minus,
  MoreVertical,
  Pause,
  Percent,
  Plus,
  Printer,
  Search,
  ShoppingBag,
  Ticket,
  Trash2,
  Undo2,
  Utensils,
  XCircle,
} from "lucide-react";
import { POS } from "@/lib/pos/theme";
import { can } from "@/lib/pos/permissions";
import { sizedImage } from "@/lib/image-url";
import { toPercent } from "@/lib/kalba/pricing";
import { addonSummary, defaultSelection, type AddonSelection } from "@/lib/kalba/addons";
import type { KioskCategory, KioskItem } from "@/lib/kiosk/types";
import type { PosStaff } from "@/lib/pos/constants";
import type { PosSettings } from "@/lib/pos/settings";
import {
  aed,
  itemPrice,
  ORDER_TYPE_LABEL,
  PAYMENT_LABEL,
  posTotals,
  type PosDiscount,
  type PosOrderType,
  type PosPayment,
  type PosQty,
} from "@/lib/pos/cart";
import { printDocument } from "@/lib/print-document";
import PosShell from "@/components/pos/PosShell";
import StaleShiftWarning from "@/components/pos/StaleShiftWarning";
import type { StaleShift } from "@/lib/pos/shift";
import PayDialog from "@/components/pos/PayDialog";
import DiscountDialog from "@/components/pos/DiscountDialog";

/**
 * Taking an order.
 *
 * Cart on the left because that is what the cashier is reading back to the
 * customer; menu on the right because that is what their hand is doing. The
 * total sits at the bottom of the cart, next to Pay, so the number being said
 * out loud and the button being pressed are in the same place.
 *
 * Everything that moves money — the discount ceiling, the coupon, the final
 * price — is settled by the server when the order is sent. What is worked out
 * here is only what the cashier needs to see while they are talking.
 */

const ORDER_TYPES: { key: PosOrderType; icon: typeof Utensils }[] = [
  { key: "dine_in", icon: Utensils },
  { key: "takeaway", icon: ShoppingBag },
  { key: "delivery", icon: Bike },
];

export interface PlacedOrder {
  /** Needed to print it — the receipt is a page, not this screen. */
  id: string | null;
  code: string;
  total: number;
  payment: PosPayment;
  orderType: string;
  count: number;
}

export default function TillScreen({
  staff,
  settings,
  categories,
  items,
  tables,
  stale,
}: {
  staff: PosStaff;
  settings: PosSettings;
  categories: KioskCategory[];
  items: KioskItem[];
  /** Table codes from the floor plan, for the dine-in picker in PayDialog. */
  tables: string[];
  stale: StaleShift[];
}) {
  const [qty, setQty] = useState<PosQty>({});
  const [addons, setAddons] = useState<AddonSelection>({});
  const [orderType, setOrderType] = useState<PosOrderType>("takeaway");
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [address, setAddress] = useState("");
  const [tableId, setTableId] = useState("");
  /** Who a staff meal is for. Asked in the pay dialog, only for that method. */
  const [staffMealFor, setStaffMealFor] = useState("");
  const [note, setNote] = useState("");
  /** itemId → what the customer asked about that dish. */
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  /** The line whose options are open. One at a time keeps the cart scannable. */
  const [openLine, setOpenLine] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<{ id: string; name: string } | null>(null);
  const [orderNoteOpen, setOrderNoteOpen] = useState(false);

  const [discount, setDiscount] = useState<PosDiscount | null>(null);
  const [couponCode, setCouponCode] = useState("");

  const [payOpen, setPayOpen] = useState(false);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [couponOpen, setCouponOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);

  const totals = useMemo(
    () =>
      posTotals({
        items,
        qty,
        addons,
        orderType,
        deliveryCharge: settings.delivery_charge,
        freeDeliveryOver: settings.free_delivery_over,
        discount,
      }),
    [items, qty, addons, orderType, settings, discount],
  );

  const shown = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return items.filter(
      (i) =>
        (category === "all" || i.category_id === category) &&
        (!needle || i.name.toLowerCase().includes(needle)),
    );
  }, [items, category, search]);

  function add(item: KioskItem) {
    setError("");
    setQty((q) => ({ ...q, [item.id]: (q[item.id] ?? 0) + 1 }));
    // A dish with required choices starts on its first answer, as the kiosk does.
    setAddons((a) =>
      a[item.id]?.length ? a : { ...a, [item.id]: defaultSelection(item.addon_groups ?? []) },
    );
  }

  function less(item: KioskItem) {
    setQty((q) => {
      const next = (q[item.id] ?? 0) - 1;
      if (next <= 0) {
        const copy = { ...q };
        delete copy[item.id];
        return copy;
      }
      return { ...q, [item.id]: next };
    });
  }

  function removeLine(item: KioskItem) {
    setQty((q) => {
      const copy = { ...q };
      delete copy[item.id];
      return copy;
    });
    setAddons((a) => {
      const copy = { ...a };
      delete copy[item.id];
      return copy;
    });
    /* And its note. A dish taken off and added back should not silently arrive
       carrying an instruction the customer already changed their mind about. */
    setItemNotes((n) => {
      const copy = { ...n };
      delete copy[item.id];
      return copy;
    });
    setOpenLine(null);
  }

  function clearAll() {
    setQty({});
    setAddons({});
    setDiscount(null);
    setCouponCode("");
    setCustomerName("");
    setCustomerPhone("");
    setAddress("");
    setTableId("");
    setStaffMealFor("");
    setNote("");
    setItemNotes({});
    setOpenLine(null);
    setError("");
  }

  async function hold() {
    if (totals.count === 0) return;
    setBusy(true);
    await fetch("/api/pos/parked", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: customerName || tableId || `${totals.count} items`,
        total: totals.total,
        count: totals.count,
        payload: { qty, addons, orderType, customerName, customerPhone, address, tableId, note, itemNotes },
      }),
    }).catch(() => {});
    setBusy(false);
    clearAll();
  }

  async function pay(payment: PosPayment) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/pos/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemNotes,
          staffMealFor,
          qty,
          addons,
          orderType,
          payment,
          customerName,
          customerPhone,
          address,
          tableId,
          note,
          discount,
          couponCode,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error || "The order did not go through");
        setPayOpen(false);
        return;
      }
      setPlaced({
        id: body.id ?? null,
        code: body.code,
        total: body.totals?.total ?? totals.total,
        payment,
        orderType: body.orderType,
        count: body.totals?.count ?? totals.count,
      });
      setPayOpen(false);
      clearAll();
    } catch {
      setError("No connection to the server. The order was not sent.");
      setPayOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <PosShell
      staff={staff}
      title="POS System"
      subtitle="Two In One · University Kalba"
      warning={<StaleShiftWarning shifts={stale} />}
      actions={
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: POS.inkSoft }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search the menu"
              className="w-[240px] rounded-lg py-2 pl-9 pr-3 text-sm focus:outline-none"
              style={{ border: `1px solid ${POS.line}`, color: POS.ink }}
            />
          </div>
          {ORDER_TYPES.map(({ key, icon: Icon }) => {
            const active = orderType === key;
            return (
              <button
                key={key}
                onClick={() => setOrderType(key)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-bold transition-colors"
                style={{
                  background: active ? POS.action : "#fff",
                  color: active ? "#fff" : POS.inkSoft,
                  border: `1px solid ${active ? POS.action : POS.line}`,
                }}
              >
                <Icon size={15} />
                {ORDER_TYPE_LABEL[key]}
              </button>
            );
          })}
        </div>
      }
    >
      <div className="h-full flex min-h-0">
        {/* ─── The order ─── */}
        {/* On the right, where the eye ends up. A cashier reads the grid, taps
            a dish and looks at what they have built; with the cart on the left
            that is a jump backwards across the screen on every single tap. */}
        <aside
          className="order-2 shrink-0 flex flex-col bg-white"
          style={{ width: 372, borderLeft: `1px solid ${POS.line}` }}
        >
          <div
            className="shrink-0 flex items-center justify-between gap-2 px-3.5 py-3"
            style={{ borderBottom: `1px solid ${POS.line}` }}
          >
            <p className="text-[17px] font-black" style={{ color: POS.ink }}>New Order</p>
            <span
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-bold text-white"
              style={{ background: POS.action }}
            >
              {orderType === "delivery" ? <Bike size={13} /> : orderType === "dine_in" ? <Utensils size={13} /> : <ShoppingBag size={13} />}
              {ORDER_TYPE_LABEL[orderType]}
            </span>
          </div>

          <div className="pos-scroll flex-1 px-3.5 py-3">
            {/* Who it is for. Only what this order type actually needs. */}
            <div className="space-y-2">
              <Input value={customerName} onChange={setCustomerName} placeholder="Customer name" />
              {(orderType === "delivery" || orderType === "takeaway") && (
                <Input value={customerPhone} onChange={setCustomerPhone} placeholder="Phone number" />
              )}
              {orderType === "delivery" && (
                <Input value={address} onChange={setAddress} placeholder="Delivery address" multiline />
              )}
              {/* No table field here. It is asked for in the pay dialog, where
                  it is required and cannot be skipped — a dine-in order with no
                  table is a plate nobody can carry anywhere, and "fill it in
                  later" is after the customer has left the counter. */}
            </div>

            <div className="mt-3" style={{ borderTop: `1px solid ${POS.line}` }} />

            {totals.lines.length === 0 ? (
              <p className="py-10 text-center text-[13px]" style={{ color: POS.inkSoft }}>
                Tap a dish to start the order.
              </p>
            ) : (
              totals.lines.map((line) => {
                const extras = addonSummary(line.groups, addons[line.item.id], (a) => a.name);
                return (
                  <div key={line.item.id} className="py-2.5" style={{ borderBottom: `1px solid ${POS.line}` }}>
                    <div className="flex items-start gap-2">
                      <span className="text-[13px] font-bold" style={{ color: POS.ink }}>
                        {line.qty}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13px] font-semibold leading-tight" style={{ color: POS.ink }}>
                          {line.item.name}
                        </span>
                        {extras && (
                          <span className="block text-[11px] leading-tight" style={{ color: POS.inkSoft }}>
                            {extras}
                          </span>
                        )}
                      </span>
                      <span className="text-[13px] font-bold" style={{ color: POS.ink }}>
                        {line.lineTotal.toFixed(2)}
                      </span>
                      <button
                        onClick={() => setOpenLine((v) => (v === line.item.id ? null : line.item.id))}
                        aria-label={`Options for ${line.item.name}`}
                        className="-me-1 flex h-7 w-6 shrink-0 items-center justify-center rounded-lg"
                        style={{ color: openLine === line.item.id ? POS.ink : POS.inkSoft }}
                      >
                        <MoreVertical size={15} />
                      </button>
                    </div>

                    {/* What the customer asked about this dish. */}
                    {itemNotes[line.item.id] && (
                      <p
                        className="mt-1 rounded-lg px-2 py-1 text-[11.5px] font-semibold"
                        style={{ background: "#FFFBEB", color: "#92400E" }}
                        dir="auto"
                      >
                        {itemNotes[line.item.id]}
                      </p>
                    )}

                    <div className="mt-1.5 flex items-center gap-1.5">
                      <Tiny onClick={() => less(line.item)} label="One less">
                        <Minus size={12} />
                      </Tiny>
                      <Tiny onClick={() => add(line.item)} label="One more">
                        <Plus size={12} />
                      </Tiny>
                      <Tiny onClick={() => removeLine(line.item)} label="Remove" danger>
                        <Trash2 size={12} />
                      </Tiny>
                    </div>

                    {/* ─── Item options ─── */}
                    {openLine === line.item.id && (
                      <div
                        className="mt-2 rounded-xl px-2 py-2"
                        style={{ border: `1px solid ${POS.line}`, background: POS.page }}
                      >
                        <p className="px-1 pb-1.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: POS.inkSoft }}>
                          Item options
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          <LineAction
                            icon={<MessageSquare size={13} />}
                            label={itemNotes[line.item.id] ? "Edit item note" : "Add item note"}
                            onClick={() => {
                              setNoteFor({ id: line.item.id, name: line.item.name });
                              setOpenLine(null);
                            }}
                          />
                          {/* Greyed, and it says why. Nothing has been charged
                              yet, so there is nothing to give back — a refund
                              lives on the order board once the order exists.
                              Shown rather than hidden so a cashier looking for
                              it knows where it went. */}
                          <LineAction
                            icon={<Undo2 size={13} />}
                            label="Refund item"
                            hint="Available after payment"
                            disabled
                            onClick={() => {}}
                          />
                          <LineAction
                            icon={<XCircle size={13} />}
                            label="Cancel item"
                            danger
                            onClick={() => removeLine(line.item)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* ─── The money ─── */}
          <div className="shrink-0 px-3.5 py-3" style={{ borderTop: `1px solid ${POS.line}` }}>
            <Row label="Subtotal" value={aed(totals.itemsTotal)} />
            {totals.deliveryCharge > 0 && (
              <Row label="Delivery" value={aed(totals.deliveryCharge)} />
            )}
            {totals.discount > 0 && (
              <Row label="Discount" value={`− ${aed(totals.discount)}`} good />
            )}
            <Row label="VAT (5%, included)" value={aed(totals.vat)} muted />

            <div
              className="mt-2 flex items-baseline justify-between pt-2"
              style={{ borderTop: `1px solid ${POS.line}` }}
            >
              <span className="text-sm font-black" style={{ color: POS.ink }}>TOTAL</span>
              <span className="text-2xl font-black" style={{ color: POS.ink }}>{aed(totals.total)}</span>
            </div>

            {error && (
              <p
                className="mt-2 rounded-lg px-2.5 py-2 text-[12px] font-semibold"
                style={{ background: POS.badSoft, color: POS.bad }}
              >
                {error}
              </p>
            )}

            {/* Paying is the one thing this screen is for, so it gets the full
                width and everything else sits under it. */}
            <button
              onClick={() => setPayOpen(true)}
              disabled={totals.count === 0 || busy}
              className="mt-2.5 w-full flex items-center justify-center gap-2 rounded-xl text-[16px] font-bold text-white disabled:opacity-40"
              style={{ background: POS.action, height: 52 }}
            >
              <CreditCard size={17} />
              Pay {aed(totals.total)}
            </button>

            {/* ─── Everything else you can do with a basket ─── */}
            <div className="mt-2 grid grid-cols-5 gap-1.5">
              <Foot icon={<Pause size={15} />} label="Hold" onClick={hold} disabled={totals.count === 0 || busy} />
              <Foot icon={<Percent size={15} />} label="Discount" onClick={() => setDiscountOpen(true)} disabled={totals.count === 0} />
              <Foot icon={<Ticket size={15} />} label="Coupon" onClick={() => setCouponOpen(true)} disabled={totals.count === 0} />
              <Foot
                icon={<ClipboardList size={15} />}
                label="Order Note"
                onClick={() => setOrderNoteOpen(true)}
                active={Boolean(note)}
              />
              <Foot
                icon={<Printer size={15} />}
                label="Print"
                /* Only ever the order just placed. There is nothing to print
                   from a basket that has not been rung up — the receipt does
                   not exist until the order does. */
                onClick={() => placed && printDocument(`/pos/invoice/${placed.id}`)}
                disabled={!placed}
              />
            </div>

            <button
              onClick={clearAll}
              disabled={totals.count === 0}
              className="mt-1.5 w-full flex items-center justify-center gap-1.5 rounded-xl text-[13px] font-bold disabled:opacity-40"
              style={{ background: POS.badSoft, color: POS.bad, height: 40 }}
            >
              <Trash2 size={14} />
              Clear the order
            </button>
          </div>
        </aside>

        {/* ─── The menu ─── */}
        <section className="order-1 flex-1 min-w-0 flex flex-col">
          <div className="pos-scroll shrink-0 flex gap-2 overflow-x-auto px-4 py-3">
            <Chip label="All Items" active={category === "all"} onClick={() => setCategory("all")} />
            {categories.map((c) => (
              <Chip
                key={c.id}
                label={`${c.emoji} ${c.label}`}
                active={category === c.id}
                onClick={() => setCategory(c.id)}
              />
            ))}
          </div>

          <div className="pos-scroll flex-1 px-4 pb-3">
            {shown.length === 0 ? (
              <p className="py-16 text-center text-sm" style={{ color: POS.inkSoft }}>
                Nothing matches.
              </p>
            ) : (
              <div
              className="grid gap-3"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(158px, 1fr))" }}
            >
                {shown.map((item) => {
                  const n = qty[item.id] ?? 0;
                  const offer = toPercent(item.discount_percent);
                  const price = itemPrice(item);
                  const net = offer > 0 ? Math.round(price * (100 - offer)) / 100 : price;
                  /* Run out, per Item Availability. Drawn greyed and refused
                     rather than hidden: a cashier facing someone asking for it
                     needs to find it and say it is finished. A dish that simply
                     vanished from the grid gets rung up as something else. */
                  const soldOut = item.is_available === false;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { if (!soldOut) add(item); }}
                      disabled={soldOut}
                      aria-disabled={soldOut}
                      className="group relative flex flex-col overflow-hidden rounded-2xl bg-white text-start transition-transform active:scale-[0.97]"
                      style={{
                        border: `1.5px solid ${n > 0 ? POS.action : POS.line}`,
                        boxShadow: n > 0 ? `0 0 0 3px ${POS.action}1f` : "0 1px 2px rgba(16,24,40,0.04)",
                      }}
                    >
                      {/*
                        Square, and filled.

                        4:3 with object-cover took the top off every portrait
                        shot; object-contain fixed that and left a card that
                        was mostly empty grey. A square is the compromise that
                        is not really a compromise — the photos are square or
                        near it, so almost nothing is lost to the crop, and
                        nothing is lost to letterboxing either.
                      */}
                      <div className="relative w-full" style={{ aspectRatio: "1 / 1", background: POS.page }}>
                        {item.image_url ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={sizedImage(item.image_url, 300)}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover"
                            style={{ opacity: soldOut ? 0.4 : 1 }}
                          />
                        ) : (
                          /* No photo. The initial rather than a broken-image
                             icon, so the tile still has something to aim at. */
                          <span
                            className="flex h-full w-full items-center justify-center text-3xl font-black"
                            style={{ color: "#D3D8DC" }}
                          >
                            {item.name.charAt(0).toUpperCase()}
                          </span>
                        )}

                        {offer > 0 && (
                          <span
                            className="absolute left-1.5 top-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-extrabold text-white"
                            style={{ background: POS.good }}
                          >
                            {offer}% OFF
                          </span>
                        )}
                        {n > 0 && (
                          <span
                            className="absolute right-1.5 top-1.5 flex h-7 min-w-[28px] items-center justify-center rounded-full px-1.5 text-[13px] font-black text-white"
                            style={{ background: POS.action, boxShadow: "0 1px 4px rgba(0,0,0,0.25)" }}
                          >
                            {n}
                          </span>
                        )}
                        {soldOut && (
                          <span
                            className="absolute inset-x-0 bottom-0 py-1 text-center text-[10.5px] font-extrabold uppercase tracking-wide text-white"
                            style={{ background: POS.bad }}
                          >
                            Out of stock
                          </span>
                        )}
                      </div>

                      {/* The name gets two lines and takes whatever it needs;
                          the price is pinned to the bottom by flex, so a
                          one-line dish and a two-line one still line their
                          prices up across the row. */}
                      <div className="flex flex-1 flex-col px-2.5 pb-2 pt-1.5">
                        <p
                          className="text-[12.5px] font-semibold leading-[1.25]"
                          style={{
                            color: soldOut ? POS.inkSoft : POS.ink,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {item.name}
                        </p>

                        <span className="mt-auto flex items-baseline gap-1.5 pt-1.5">
                          <span
                            className="text-[15px] font-black leading-none"
                            style={{ color: soldOut ? POS.inkSoft : POS.ink }}
                          >
                            {net.toFixed(2)}
                          </span>
                          <span className="text-[10px] font-bold" style={{ color: POS.inkSoft }}>
                            AED
                          </span>
                          {/* What it was, when there is an offer — a cashier
                              asked "why is that cheaper?" has the answer on
                              the tile rather than in their head. */}
                          {offer > 0 && (
                            <span
                              className="text-[11px] font-semibold line-through"
                              style={{ color: POS.inkSoft }}
                            >
                              {price.toFixed(2)}
                            </span>
                          )}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

        </section>
      </div>

      {/* A note against one dish, and a note against the whole ticket. Same
          dialog, because they are the same act with a different subject. */}
      {noteFor && (
        <NoteDialog
          title={noteFor.name}
          subtitle="What should the kitchen know about this dish?"
          initial={itemNotes[noteFor.id] ?? ""}
          max={120}
          onCancel={() => setNoteFor(null)}
          onSave={(text) => {
            setItemNotes((n) => {
              if (!text) {
                const copy = { ...n };
                delete copy[noteFor.id];
                return copy;
              }
              return { ...n, [noteFor.id]: text };
            });
            setNoteFor(null);
          }}
        />
      )}

      {orderNoteOpen && (
        <NoteDialog
          title="Order note"
          subtitle="For the whole ticket — cutlery, allergies, where to call."
          initial={note}
          max={300}
          onCancel={() => setOrderNoteOpen(false)}
          onSave={(text) => { setNote(text); setOrderNoteOpen(false); }}
        />
      )}

      {couponOpen && (
        <NoteDialog
          title="Coupon"
          subtitle="The code the customer is holding. Checked when the order goes through."
          initial={couponCode}
          max={40}
          uppercase
          placeholder="CODE"
          saveLabel="Apply"
          onCancel={() => setCouponOpen(false)}
          onSave={(text) => { setCouponCode(text); setCouponOpen(false); }}
        />
      )}

      {payOpen && (
        <PayDialog
          total={totals.total}
          busy={busy}
          /* Only dine-in. A takeaway has no table and being asked for one is a
             field somebody has to think about and then skip on every order. */
          requireTable={orderType === "dine_in"}
          tables={tables}
          table={tableId}
          onTable={setTableId}
          staffName={staffMealFor}
          onStaffName={setStaffMealFor}
          onCancel={() => setPayOpen(false)}
          onPay={pay}
        />
      )}

      {discountOpen && (
        <DiscountDialog
          current={discount}
          itemsTotal={totals.itemsTotal}
          maxPercent={can(staff, "discount_any") ? 100 : settings.max_cashier_discount_percent}
          isManager={can(staff, "discount_any")}
          onClose={() => setDiscountOpen(false)}
          onApply={(d) => { setDiscount(d); setDiscountOpen(false); }}
        />
      )}

      {/* ─── Rung up ─── */}
      {placed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-full max-w-[400px] rounded-2xl bg-white p-6 text-center">
            <span
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
              style={{ background: POS.goodSoft }}
            >
              <Check size={28} strokeWidth={3} style={{ color: POS.good }} />
            </span>
            <h2 className="mt-3 text-xl font-black" style={{ color: POS.ink }}>Order placed</h2>
            <p className="mt-3 text-4xl font-black" style={{ color: POS.ink }}>{placed.code}</p>
            <p className="mt-1 text-sm" style={{ color: POS.inkSoft }}>
              {placed.orderType} · {placed.count} item{placed.count === 1 ? "" : "s"} ·{" "}
              {PAYMENT_LABEL[placed.payment]} · {aed(placed.total)}
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => placed.id && printDocument(`/pos/invoice/${placed.id}`)}
                disabled={!placed.id}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl text-sm font-bold disabled:opacity-40"
                style={{ border: `1px solid ${POS.line}`, color: POS.ink, height: 46 }}
              >
                <Printer size={15} />
                Print receipt
              </button>
              <button
                onClick={() => setPlaced(null)}
                className="flex-1 rounded-xl text-sm font-bold text-white"
                style={{ background: POS.action, height: 46 }}
              >
                Next order
              </button>
            </div>
          </div>
        </div>
      )}
    </PosShell>
  );
}

/* ─── Small pieces ─────────────────────────────────────────────────────────── */

function Input({
  value,
  onChange,
  placeholder,
  multiline,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  multiline?: boolean;
}) {
  const shared = {
    value,
    placeholder,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
    className: "w-full rounded-lg px-2.5 py-2 text-[13px] focus:outline-none",
    style: { border: `1px solid ${POS.line}`, color: POS.ink },
  };
  return multiline ? <textarea rows={2} {...shared} className={`${shared.className} resize-none`} /> : <input {...shared} />;
}

function Row({ label, value, good, muted }: { label: string; value: string; good?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between py-0.5">
      <span className="text-[12px]" style={{ color: POS.inkSoft }}>{label}</span>
      <span
        className="text-[12.5px] font-semibold"
        style={{ color: good ? POS.good : muted ? POS.inkSoft : POS.ink }}
      >
        {value}
      </span>
    </div>
  );
}

/** One entry in a cart line's options: an icon, a label, sometimes a reason. */
/** One of the five squat buttons under the Pay button. */
/**
 * A short piece of text, typed at the till.
 *
 * One component for the item note, the order note and the coupon, because all
 * three are "type a thing, keep it or drop it" and three near-identical modals
 * would drift apart the first time any of them was touched. Unlike the kiosk's,
 * this one has no on-screen keyboard: the till has a real one, or a tablet
 * whose browser raises the system keyboard on a focused field.
 */
function NoteDialog({
  title,
  subtitle,
  initial,
  max,
  uppercase,
  placeholder,
  saveLabel = "Save",
  onCancel,
  onSave,
}: {
  title: string;
  subtitle: string;
  initial: string;
  max: number;
  uppercase?: boolean;
  placeholder?: string;
  saveLabel?: string;
  onCancel: () => void;
  onSave: (text: string) => void;
}) {
  const [text, setText] = useState(initial);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(0,0,0,0.5)" }}
    >
      <div className="w-full max-w-[440px] rounded-2xl bg-white p-6">
        <h2 className="text-lg font-black" style={{ color: POS.ink }}>{title}</h2>
        <p className="mt-0.5 text-[12.5px]" style={{ color: POS.inkSoft }}>{subtitle}</p>

        <textarea
          value={text}
          autoFocus
          onChange={(e) =>
            setText(
              (uppercase ? e.target.value.toUpperCase() : e.target.value).slice(0, max),
            )
          }
          rows={uppercase ? 1 : 3}
          placeholder={placeholder ?? "Type it here"}
          dir="auto"
          className="mt-4 w-full resize-none rounded-xl px-3 py-2.5 text-[15px] font-semibold focus:outline-none"
          style={{ border: `1px solid ${POS.line}`, color: POS.ink }}
        />
        <p className="mt-1 text-end text-[11px]" style={{ color: POS.inkSoft }}>
          {text.length} / {max}
        </p>

        <div className="mt-3 flex gap-2">
          {/* Clearing is its own button. Holding backspace forty times to undo
              a note is not a thing anybody should do at a counter. */}
          <button
            onClick={() => onSave("")}
            className="rounded-xl px-4 text-sm font-bold"
            style={{ background: POS.page, color: POS.ink, height: 48 }}
          >
            {initial ? "Remove" : "Cancel"}
          </button>
          <button
            onClick={onCancel}
            className="rounded-xl px-4 text-sm font-bold"
            style={{ background: POS.page, color: POS.ink, height: 48 }}
          >
            Close
          </button>
          <button
            onClick={() => onSave(text.trim())}
            className="flex-1 rounded-xl text-[15px] font-bold text-white"
            style={{ background: POS.action, height: 48 }}
          >
            {saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function Foot({
  icon,
  label,
  onClick,
  disabled,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10.5px] font-bold leading-none disabled:opacity-35"
      style={{
        border: `1px solid ${active ? POS.action : POS.line}`,
        background: active ? POS.goodSoft : "#fff",
        color: active ? POS.action : POS.ink,
      }}
    >
      {icon}
      <span className="text-center">{label}</span>
    </button>
  );
}

function LineAction({
  icon,
  label,
  hint,
  danger,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-[12px] font-bold disabled:opacity-50"
      style={{
        border: `1px solid ${POS.line}`,
        color: disabled ? POS.inkSoft : danger ? POS.bad : POS.ink,
      }}
    >
      {icon}
      <span className="text-start leading-tight">
        {label}
        {hint && (
          <span className="block text-[10px] font-semibold" style={{ color: POS.inkSoft }}>
            {hint}
          </span>
        )}
      </span>
    </button>
  );
}

function Tiny({
  onClick,
  label,
  danger,
  children,
}: {
  onClick: () => void;
  label: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex h-6 w-6 items-center justify-center rounded active:scale-90 transition-transform"
      style={{
        background: danger ? POS.badSoft : POS.page,
        color: danger ? POS.bad : POS.ink,
      }}
    >
      {children}
    </button>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 rounded-lg px-3.5 py-2 text-[13px] font-bold whitespace-nowrap transition-colors"
      style={{
        background: active ? POS.action : "#fff",
        color: active ? "#fff" : POS.inkSoft,
        border: `1px solid ${active ? POS.action : POS.line}`,
      }}
    >
      {label}
    </button>
  );
}

