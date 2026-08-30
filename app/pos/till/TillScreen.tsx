"use client";

import { useMemo, useState } from "react";
import {
  Bike,
  Check,
  ClipboardList,
  CreditCard,
  Minus,
  Pause,
  Percent,
  Plus,
  Printer,
  Search,
  ShoppingBag,
  Trash2,
  Utensils,
} from "lucide-react";
import { POS } from "@/lib/pos/theme";
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
import PosShell from "@/components/pos/PosShell";
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
}: {
  staff: PosStaff;
  settings: PosSettings;
  categories: KioskCategory[];
  items: KioskItem[];
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
  const [note, setNote] = useState("");

  const [discount, setDiscount] = useState<PosDiscount | null>(null);
  const [couponCode, setCouponCode] = useState("");

  const [payOpen, setPayOpen] = useState(false);
  const [discountOpen, setDiscountOpen] = useState(false);
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
    setNote("");
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
        payload: { qty, addons, orderType, customerName, customerPhone, address, tableId, note },
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
        <aside
          className="shrink-0 flex flex-col bg-white"
          style={{ width: 350, borderRight: `1px solid ${POS.line}` }}
        >
          <div className="shrink-0 px-3.5 py-2.5" style={{ background: POS.night }}>
            <p className="text-sm font-bold text-white">New Order</p>
            <p className="text-[11px] text-white/60">{ORDER_TYPE_LABEL[orderType]}</p>
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
              {orderType === "dine_in" && (
                <Input value={tableId} onChange={setTableId} placeholder="Table number" />
              )}
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
                    </div>
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

            <div className="mt-2.5 flex gap-2">
              <button
                onClick={clearAll}
                disabled={totals.count === 0}
                className="flex items-center justify-center gap-1.5 rounded-xl px-3 text-[13px] font-bold disabled:opacity-40"
                style={{ background: POS.badSoft, color: POS.bad, height: 46 }}
              >
                <Trash2 size={15} />
                Clear
              </button>
              <button
                onClick={hold}
                disabled={totals.count === 0 || busy}
                className="flex items-center justify-center gap-1.5 rounded-xl px-3 text-[13px] font-bold disabled:opacity-40"
                style={{ background: POS.page, color: POS.ink, border: `1px solid ${POS.line}`, height: 46 }}
              >
                <Pause size={15} />
                Hold
              </button>
              <button
                onClick={() => setPayOpen(true)}
                disabled={totals.count === 0 || busy}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl text-[15px] font-bold text-white disabled:opacity-40"
                style={{ background: POS.action, height: 46 }}
              >
                <CreditCard size={16} />
                Pay {aed(totals.total)}
              </button>
            </div>
          </div>
        </aside>

        {/* ─── The menu ─── */}
        <section className="flex-1 min-w-0 flex flex-col">
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
              <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(146px, 1fr))" }}>
                {shown.map((item) => {
                  const n = qty[item.id] ?? 0;
                  const offer = toPercent(item.discount_percent);
                  const price = itemPrice(item);
                  const net = offer > 0 ? Math.round(price * (100 - offer)) / 100 : price;
                  return (
                    <button
                      key={item.id}
                      onClick={() => add(item)}
                      className="relative rounded-xl overflow-hidden bg-white text-start active:scale-[0.98] transition-transform"
                      style={{
                        border: `1px solid ${n > 0 ? POS.action : POS.line}`,
                        boxShadow: n > 0 ? `0 0 0 2px ${POS.action}22` : "none",
                      }}
                    >
                      <div className="relative w-full" style={{ aspectRatio: "4 / 3", background: POS.page }}>
                        {item.image_url && (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={item.image_url} alt="" loading="lazy" className="w-full h-full object-cover" />
                        )}
                        {n > 0 && (
                          <span
                            className="absolute top-1.5 right-1.5 flex h-6 min-w-[24px] items-center justify-center rounded-full px-1.5 text-[12px] font-black text-white"
                            style={{ background: POS.action }}
                          >
                            {n}
                          </span>
                        )}
                        {offer > 0 && (
                          <span
                            className="absolute top-1.5 left-1.5 rounded px-1.5 py-0.5 text-[10px] font-extrabold text-white"
                            style={{ background: POS.good }}
                          >
                            {offer}% OFF
                          </span>
                        )}
                      </div>
                      <div className="px-2 py-1.5">
                        <p
                          className="text-[12px] font-semibold leading-tight"
                          style={{
                            color: POS.ink,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            minHeight: "2.4em",
                          }}
                        >
                          {item.name}
                        </p>
                        <p className="mt-0.5 text-[13px] font-black" style={{ color: POS.ink }}>
                          {net.toFixed(2)}
                          <span className="ms-1 text-[10px] font-bold" style={{ color: POS.inkSoft }}>AED</span>
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ─── Tools ─── */}
          <div
            className="pos-chrome shrink-0 flex items-center gap-2 px-4 py-2.5 bg-white"
            style={{ borderTop: `1px solid ${POS.line}` }}
          >
            <Tool onClick={() => setDiscountOpen(true)} icon={<Percent size={15} />} label="Discount" />
            <Tool
              onClick={() => {
                const code = window.prompt("Coupon code");
                if (code !== null) setCouponCode(code.trim().toUpperCase());
              }}
              icon={<Check size={15} />}
              label={couponCode ? `Coupon ${couponCode}` : "Coupon"}
              active={Boolean(couponCode)}
            />
            <Tool
              onClick={() => {
                const typed = window.prompt("Note for the kitchen", note);
                if (typed !== null) setNote(typed);
              }}
              icon={<ClipboardList size={15} />}
              label={note ? "Note added" : "Order Note"}
              active={Boolean(note)}
            />
            <div className="flex-1" />
            <Tool onClick={() => window.print()} icon={<Printer size={15} />} label="Print" />
          </div>
        </section>
      </div>

      {payOpen && (
        <PayDialog
          total={totals.total}
          busy={busy}
          onCancel={() => setPayOpen(false)}
          onPay={pay}
        />
      )}

      {discountOpen && (
        <DiscountDialog
          current={discount}
          itemsTotal={totals.itemsTotal}
          maxPercent={staff.role === "manager" ? 100 : settings.max_cashier_discount_percent}
          isManager={staff.role === "manager"}
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
                onClick={() => window.print()}
                className="flex-1 rounded-xl text-sm font-bold"
                style={{ border: `1px solid ${POS.line}`, color: POS.ink, height: 46 }}
              >
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

function Tool({
  onClick,
  icon,
  label,
  active,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-bold"
      style={{
        background: active ? POS.goodSoft : POS.page,
        color: active ? POS.good : POS.ink,
        border: `1px solid ${active ? POS.good : POS.line}`,
      }}
    >
      {icon}
      {label}
    </button>
  );
}
