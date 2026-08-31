"use client";

import { ArrowRight, Bike, CreditCard, Minus, Pencil, Plus, ShieldCheck, ShoppingBag, Trash2, X } from "lucide-react";
import type { KioskFulfilment, KioskSettings } from "@/lib/kiosk/types";
import { KIOSK } from "@/lib/kiosk/theme";
import { sizedImage } from "@/lib/image-url";
import { addonSummary } from "@/lib/kalba/addons";
import type { AddonSelection } from "@/lib/kalba/addons";
import { aed, type KioskTotals } from "@/lib/kiosk/cart";
import type { KioskItem } from "@/lib/kiosk/types";

/**
 * Step 2 — reviewing, as a panel over the menu rather than a page of its own.
 *
 * Coming back to change something is the common case, not the exception, so the
 * grid stays visible behind it and closing the panel is one press. Everything
 * that costs money is itemised here, including what the customer has saved,
 * because the kiosk is the only chance they get to read it before they commit.
 */
export interface PrivilegeHolder {
  member_id: string;
  full_name: string;
  discount_percent: number;
}

export default function ReviewPanel({
  totals,
  addons,
  settings,
  fulfilment,
  onFulfilment,
  privilege,
  privilegeEnabled,
  onClose,
  onMore,
  onLess,
  onEdit,
  onRemove,
  onPrivilege,
  onDropPrivilege,
  onContinue,
  continueLabel,
}: {
  totals: KioskTotals;
  addons: AddonSelection;
  settings: KioskSettings;
  fulfilment: KioskFulfilment;
  onFulfilment: (choice: KioskFulfilment) => void;
  privilege: PrivilegeHolder | null;
  privilegeEnabled: boolean;
  onClose: () => void;
  onMore: (item: KioskItem) => void;
  onLess: (item: KioskItem) => void;
  onEdit: (item: KioskItem) => void;
  onRemove: (item: KioskItem) => void;
  onPrivilege: () => void;
  onDropPrivilege: () => void;
  onContinue: () => void;
  continueLabel: string;
}) {
  return (
    <div className="absolute inset-0 z-30 flex" style={{ background: "rgba(0,0,0,0.45)" }}>
      <button className="flex-1" aria-label="Back to the menu" onClick={onClose} />

      <div className="w-[62%] max-w-[74vh] bg-white flex flex-col shadow-2xl">
        <div
          className="shrink-0 flex items-center justify-between px-[2.4vh] py-[2vh]"
          style={{ borderBottom: `0.13vh solid ${KIOSK.line}` }}
        >
          <div>
            <h2 className="font-black text-[2.6vh] leading-none" style={{ color: KIOSK.ink }}>
              Your Order
            </h2>
            <p className="text-[1.35vh] mt-[0.6vh]" style={{ color: KIOSK.inkSoft }}>
              {totals.count} item{totals.count === 1 ? "" : "s"} · check it over before you pay
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Back to the menu"
            className="rounded-full w-[5vh] h-[5vh] flex items-center justify-center active:scale-90 transition-transform"
            style={{ background: "#F4F4F4", color: KIOSK.ink }}
          >
            <X strokeWidth={2.5} className="w-[2.4vh] h-[2.4vh]" />
          </button>
        </div>

        {/* The lines */}
        <div className="kiosk-scroll flex-1 px-[2.4vh] py-[1.4vh]">
          {totals.lines.length === 0 ? (
            <p className="py-[8vh] text-center text-[1.7vh]" style={{ color: KIOSK.inkSoft }}>
              Nothing in your order yet.
            </p>
          ) : (
            totals.lines.map((line) => {
              const extras = addonSummary(line.groups, addons[line.item.id], (a) => a.name);
              return (
                <div
                  key={line.item.id}
                  className="flex gap-[1.4vh] py-[1.6vh]"
                  style={{ borderBottom: `0.13vh solid ${KIOSK.line}` }}
                >
                  {line.item.image_url && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={sizedImage(line.item.image_url, 200)}
                      alt=""
                      loading="lazy"
                      className="w-[8vh] h-[8vh] rounded-[1.2vh] object-cover shrink-0"
                    />
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[1.7vh] leading-tight" style={{ color: KIOSK.ink }}>
                      {line.item.name}
                    </p>

                    {extras && (
                      <p
                        className="text-[1.25vh] mt-[0.4vh] leading-snug"
                        style={{ color: KIOSK.inkSoft }}
                      >
                        {extras}
                      </p>
                    )}

                    <div className="flex items-center gap-[1.2vh] mt-[0.6vh]">
                      <span className="text-[1.35vh] font-semibold" style={{ color: KIOSK.inkSoft }}>
                        {aed(line.unitPrice)} each
                      </span>
                      {line.offerSaving > 0 && (
                        <span className="text-[1.2vh] font-bold" style={{ color: KIOSK.good }}>
                          saved {aed(line.offerSaving)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-[1vh] mt-[1vh]">
                      {/* A dish with questions is re-opened rather than stepped:
                          a second helping would otherwise silently inherit the
                          first one's answers. */}
                      {line.groups.length > 0 ? (
                        <button
                          onClick={() => onEdit(line.item)}
                          className="flex items-center gap-[0.6vh] rounded-full px-[1.4vh] h-[3.6vh] text-[1.3vh] font-bold active:scale-95 transition-transform"
                          style={{ background: KIOSK.goldSoft, color: KIOSK.onGold }}
                        >
                          <Pencil className="w-[1.4vh] h-[1.4vh]" />
                          Change · {line.qty}
                        </button>
                      ) : (
                        <div
                          className="flex items-center gap-[1.2vh] rounded-full px-[1vh]"
                          style={{ border: `0.16vh solid ${KIOSK.line}`, height: "3.8vh" }}
                        >
                          <button
                            onClick={() => onLess(line.item)}
                            aria-label={`One less ${line.item.name}`}
                            className="rounded-full w-[2.7vh] h-[2.7vh] flex items-center justify-center active:scale-90 transition-transform"
                            style={{ background: KIOSK.goldSoft, color: KIOSK.onGold }}
                          >
                            <Minus strokeWidth={3} className="w-[1.5vh] h-[1.5vh]" />
                          </button>
                          <span
                            className="font-black text-[1.6vh] w-[2.4vh] text-center"
                            style={{ color: KIOSK.ink }}
                          >
                            {line.qty}
                          </span>
                          <button
                            onClick={() => onMore(line.item)}
                            aria-label={`One more ${line.item.name}`}
                            className="rounded-full w-[2.7vh] h-[2.7vh] flex items-center justify-center active:scale-90 transition-transform"
                            style={{ background: KIOSK.gold, color: KIOSK.onGold }}
                          >
                            <Plus strokeWidth={3} className="w-[1.5vh] h-[1.5vh]" />
                          </button>
                        </div>
                      )}

                      <button
                        onClick={() => onRemove(line.item)}
                        aria-label={`Remove ${line.item.name}`}
                        className="rounded-full w-[3.6vh] h-[3.6vh] flex items-center justify-center active:scale-90 transition-transform"
                        style={{ background: "#FEF2F2", color: KIOSK.bad }}
                      >
                        <Trash2 className="w-[1.6vh] h-[1.6vh]" />
                      </button>
                    </div>
                  </div>

                  <p
                    className="font-black text-[1.9vh] shrink-0 text-end"
                    style={{ color: KIOSK.ink }}
                  >
                    {aed(line.lineTotal)}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* The money */}
        <div
          className="shrink-0 px-[2.4vh] py-[1.8vh]"
          style={{ borderTop: `0.13vh solid ${KIOSK.line}`, background: "#FCFCFC" }}
        >
          {/* Asked before the total, because it changes it. A branch that does
              not deliver never sees this and every order is for the counter. */}
          {settings.delivery_enabled && (
            <div className="mb-[1.6vh]">
              <p className="mb-[0.8vh] text-[1.4vh] font-bold" style={{ color: KIOSK.ink }}>
                How would you like it?
              </p>
              <div className="grid grid-cols-2 gap-[1vh]">
                {([
                  ["pickup", ShoppingBag, "Collect", "At the counter"],
                  ["delivery", Bike, "Delivery", settings.delivery_note || "To your address"],
                ] as const).map(([key, Icon, label, hint]) => {
                  const on = fulfilment === key;
                  return (
                    <button
                      key={key}
                      onClick={() => onFulfilment(key)}
                      className="flex items-center gap-[1vh] rounded-[1.3vh] px-[1.4vh] py-[1.2vh] text-start active:scale-[0.98] transition-transform"
                      style={{
                        border: `0.18vh solid ${on ? KIOSK.gold : KIOSK.line}`,
                        background: on ? KIOSK.goldSoft : "#fff",
                      }}
                    >
                      <Icon
                        className="w-[2.4vh] h-[2.4vh] shrink-0"
                        style={{ color: on ? KIOSK.onGold : KIOSK.inkSoft }}
                      />
                      <span className="min-w-0">
                        <span
                          className="block font-bold text-[1.5vh] leading-tight"
                          style={{ color: on ? KIOSK.onGold : KIOSK.ink }}
                        >
                          {label}
                        </span>
                        <span className="block text-[1.15vh] truncate" style={{ color: KIOSK.inkSoft }}>
                          {hint}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {privilegeEnabled && (
            privilege ? (
              <div
                className="flex items-center gap-[1.2vh] rounded-[1.3vh] px-[1.6vh] py-[1.3vh] mb-[1.4vh]"
                style={{ background: "#F0FDF4", border: `0.16vh solid #BBF7D0` }}
              >
                <ShieldCheck className="w-[2.4vh] h-[2.4vh] shrink-0" style={{ color: KIOSK.good }} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[1.5vh] leading-tight" style={{ color: "#15803D" }}>
                    Privilege Card applied
                  </p>
                  <p className="text-[1.2vh] truncate" style={{ color: "#166534" }}>
                    {privilege.member_id} · {privilege.discount_percent}% off
                  </p>
                </div>
                <button
                  onClick={onDropPrivilege}
                  className="text-[1.3vh] font-bold underline shrink-0"
                  style={{ color: "#166534" }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <button
                onClick={onPrivilege}
                className="w-full flex items-center gap-[1.2vh] rounded-[1.3vh] px-[1.6vh] py-[1.3vh] mb-[1.4vh] active:scale-[0.99] transition-transform"
                style={{ background: KIOSK.goldSoft, border: `0.16vh solid ${KIOSK.gold}` }}
              >
                <CreditCard className="w-[2.4vh] h-[2.4vh] shrink-0" style={{ color: KIOSK.onGold }} />
                <span className="flex-1 text-start">
                  <span
                    className="block font-bold text-[1.5vh] leading-tight"
                    style={{ color: KIOSK.onGold }}
                  >
                    Have a Privilege Card?
                  </span>
                  <span className="block text-[1.2vh]" style={{ color: "#6B5A12" }}>
                    Enter your member number for your discount
                  </span>
                </span>
                <ArrowRight className="w-[2vh] h-[2vh] shrink-0" style={{ color: KIOSK.onGold }} />
              </button>
            )
          )}

          <Money label="Subtotal" value={aed(totals.subtotal)} />
          {totals.itemOffers > 0 && (
            <Money label="Item offers" value={`− ${aed(totals.itemOffers)}`} good />
          )}
          {totals.privilegeDiscount > 0 && (
            <Money
              label={`Privilege discount (${privilege?.discount_percent ?? 0}%)`}
              value={`− ${aed(totals.privilegeDiscount)}`}
              good
            />
          )}
          {totals.deliveryCharge > 0 && (
            <Money label="Delivery" value={aed(totals.deliveryCharge)} />
          )}

          <div
            className="flex items-baseline justify-between mt-[1.2vh] pt-[1.2vh]"
            style={{ borderTop: `0.13vh solid ${KIOSK.line}` }}
          >
            <span className="font-black text-[2vh]" style={{ color: KIOSK.ink }}>
              Total
            </span>
            <span className="font-black text-[3vh]" style={{ color: KIOSK.ink }}>
              {aed(totals.total)}
            </span>
          </div>
          <p className="text-[1.2vh] mt-[0.3vh] text-end" style={{ color: KIOSK.inkSoft }}>
            Includes {aed(totals.vat)} VAT
          </p>

          <div className="flex gap-[1.2vh] mt-[1.8vh]">
            <button
              onClick={onClose}
              className="rounded-[1.4vh] px-[2.4vh] font-bold text-[1.7vh] active:scale-95 transition-transform"
              style={{ background: "#F4F4F4", color: KIOSK.ink, height: "6.2vh" }}
            >
              Add More
            </button>
            <button
              onClick={onContinue}
              disabled={totals.count === 0}
              className="flex-1 rounded-[1.4vh] flex items-center justify-center gap-[1vh] font-black text-[2vh] active:scale-[0.98] transition-transform disabled:opacity-35"
              style={{ background: KIOSK.gold, color: KIOSK.onGold, height: "6.2vh" }}
            >
              {continueLabel}
              <ArrowRight strokeWidth={3} className="w-[2.2vh] h-[2.2vh]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Money({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="flex items-baseline justify-between py-[0.4vh]">
      <span className="text-[1.5vh]" style={{ color: KIOSK.inkSoft }}>
        {label}
      </span>
      <span
        className="text-[1.6vh] font-bold"
        style={{ color: good ? KIOSK.good : KIOSK.ink }}
      >
        {value}
      </span>
    </div>
  );
}
