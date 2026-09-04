"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KIOSK } from "@/lib/kiosk/theme";
import { dirFor, kioskField, kioskT, type KioskLang } from "@/lib/kiosk/i18n";
import { defaultSelection, type AddonSelection } from "@/lib/kalba/addons";
import { kioskTotals, type KioskQty } from "@/lib/kiosk/cart";
import {
  deviceLabel,
  type KioskData,
  type KioskDevice,
  type KioskFulfilment,
  type KioskItem,
} from "@/lib/kiosk/types";
import { KioskHeader, type KioskStepKey } from "@/components/kiosk/Chrome";
import AttractScreen from "@/components/kiosk/AttractScreen";
import MenuScreen from "@/components/kiosk/MenuScreen";
import OptionsSheet from "@/components/kiosk/OptionsSheet";
import ReviewPanel, { type PrivilegeHolder } from "@/components/kiosk/ReviewPanel";
import PrivilegeModal from "@/components/kiosk/PrivilegeModal";
import PhoneScreen from "@/components/kiosk/PhoneScreen";
import NoteSheet from "@/components/kiosk/NoteSheet";
import DoneScreen, { type KioskConfirmation } from "@/components/kiosk/DoneScreen";

/**
 * The kiosk, as one state machine over four screens.
 *
 * Four pages: the idle screen, the menu, the phone number, and the number they
 * walk away with. Review and the Privilege Card are steps in the flow but not
 * pages — both are panels over the menu, because both are places people go back
 * and forth from, and a page transition each way makes changing your mind feel
 * like starting again.
 *
 * Two things run underneath all of it. Anything abandoned mid-order returns to
 * idle on a timer, so the next customer never inherits a stranger's basket. And
 * every return to idle re-reads the menu, so a screen that has been standing
 * since breakfast is still selling today's prices.
 */

type Screen = "attract" | "menu" | "phone" | "done";

/** The same record without one key. Removing a dish touches two of these. */
function without<T>(record: Record<string, T>, key: string): Record<string, T> {
  if (!(key in record)) return record;
  const next = { ...record };
  delete next[key];
  return next;
}

/**
 * The confirmation screen runs its own visible countdown, so the idle timer is
 * only a backstop behind it — this is the grace it allows before stepping in,
 * which keeps the two from firing at the same instant and resetting twice.
 */
const DONE_BACKSTOP_SECONDS = 15;

export default function KioskApp({
  initial,
  device,
}: {
  initial: KioskData;
  /** Which panel this is, or null for the unnamed /kiosk. */
  device: KioskDevice | null;
}) {
  const [data, setData] = useState(initial);
  const [screen, setScreen] = useState<Screen>("attract");

  const [qty, setQty] = useState<KioskQty>({});
  const [addons, setAddons] = useState<AddonSelection>({});

  const [reviewOpen, setReviewOpen] = useState(false);
  const [privilegeOpen, setPrivilegeOpen] = useState(false);
  const [sheet, setSheet] = useState<{ item: KioskItem; editing: boolean } | null>(null);

  const [privilege, setPrivilege] = useState<PrivilegeHolder | null>(null);
  const [privilegeCode, setPrivilegeCode] = useState("");

  /* What the customer wants said about the food: one note per dish, and one for
     the ticket as a whole. Kept beside the basket rather than inside it, so a
     dish stepped from 1 to 2 and back does not lose what was asked about it. */
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [orderNote, setOrderNote] = useState("");
  /** The dish whose note is being written, or "order" for the whole ticket. */
  const [noting, setNoting] = useState<KioskItem | "order" | null>(null);

  /* Collect unless the customer says otherwise. The screen is standing in the
     branch they would be collecting from. */
  const [fulfilment, setFulfilment] = useState<KioskFulfilment>("pickup");

  /* Language is order state, not a preference. A customer who switches to
     Arabic has not set the screen to Arabic for everybody after them, so it
     resets with the basket like everything else. */
  const [lang, setLang] = useState<KioskLang>("en");
  const t = useMemo(() => kioskT(lang), [lang]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState<KioskConfirmation | null>(null);

  const { settings, ads, categories, items } = data;

  const totals = useMemo(
    () => kioskTotals(items, qty, addons, privilege?.discount_percent ?? 0),
    [items, qty, addons, privilege],
  );

  /* ─── Going back to sleep ─────────────────────────────────────────────── */

  const reset = useCallback(() => {
    setQty({});
    setAddons({});
    setNotes({});
    setOrderNote("");
    setNoting(null);
    setPrivilege(null);
    setPrivilegeCode("");
    setFulfilment("pickup");
    setLang("en");
    setReviewOpen(false);
    setPrivilegeOpen(false);
    setSheet(null);
    setConfirmation(null);
    setError("");
    setSubmitting(false);
    setScreen("attract");

    /* The menu is re-read here rather than on a timer: idle is the only moment
       the screen is certain not to be halfway through somebody's order. */
    fetch("/api/kiosk/menu", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((fresh: KioskData | null) => { if (fresh?.settings) setData(fresh); })
      .catch(() => { /* keep serving what we already have */ });
  }, []);

  /**
   * The abandonment timer.
   *
   * Someone walks off mid-order more often than they finish one, and what they
   * leave on the panel is a basket, sometimes a phone number. Any touch puts
   * the clock back to the start; silence for the configured stretch clears it.
   * The confirmation screen runs its own, shorter countdown instead.
   */
  const idleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bumpIdle = useCallback(() => {
    if (idleRef.current) clearTimeout(idleRef.current);
    if (screen === "attract") return;
    const seconds =
      screen === "done"
        ? (settings.reset_seconds || DONE_BACKSTOP_SECONDS) + DONE_BACKSTOP_SECONDS
        : settings.idle_timeout_seconds;
    if (seconds <= 0) return;
    idleRef.current = setTimeout(reset, seconds * 1000);
  }, [screen, settings.idle_timeout_seconds, settings.reset_seconds, reset]);

  useEffect(() => {
    bumpIdle();
    return () => { if (idleRef.current) clearTimeout(idleRef.current); };
  }, [bumpIdle]);

  /* ─── The basket ──────────────────────────────────────────────────────── */

  const bump = useCallback((item: KioskItem, by: number) => {
    setQty((q) => {
      const next = Math.max(0, (q[item.id] ?? 0) + by);
      if (next === 0) return without(q, item.id);
      return { ...q, [item.id]: next };
    });
    // Emptying a dish out forgets its answers: coming back to it still carrying
    // last time's extra cheese is a charge nobody asked for.
    if (by < 0) {
      setAddons((a) => ((qty[item.id] ?? 0) + by > 0 ? a : without(a, item.id)));
    }
  }, [qty]);

  /** A dish with questions opens its sheet; everything else drops straight in. */
  const add = useCallback((item: KioskItem) => {
    if ((item.addon_groups ?? []).length > 0) {
      setSheet({ item, editing: (qty[item.id] ?? 0) > 0 });
      return;
    }
    bump(item, 1);
  }, [bump, qty]);

  const remove = useCallback((item: KioskItem) => {
    setQty((q) => without(q, item.id));
    setAddons((a) => without(a, item.id));
    /* And its note. A dish taken out and put back should not silently arrive
       carrying "no onions" from a decision the customer already reversed. */
    setNotes((n) => without(n, item.id));
  }, []);

  /**
   * The combo, as its own dishes rather than a line of its own.
   *
   * The kitchen makes a burger, fries and a drink whatever the banner calls the
   * bundle, and the invoice has to itemise what was charged. Anything in the
   * combo that asks questions is opened for an answer rather than guessed at.
   */
  const addCombo = useCallback(() => {
    const wanted = settings.combo_item_ids
      .map((id) => items.find((i) => i.id === id))
      .filter((i): i is KioskItem => Boolean(i));

    if (wanted.length === 0) return;

    setQty((q) => {
      const next = { ...q };
      for (const item of wanted) next[item.id] = (next[item.id] ?? 0) + 1;
      return next;
    });
    // Required single-choice questions are opened on their first answer, which
    // is what the sheet would have shown anyway.
    setAddons((a) => {
      const next = { ...a };
      for (const item of wanted) {
        if (!next[item.id]?.length) next[item.id] = defaultSelection(item.addon_groups ?? []);
      }
      return next;
    });
  }, [items, settings.combo_item_ids]);

  /* ─── Placing it ──────────────────────────────────────────────────────── */

  async function placeOrder(phone: string, channels: string[]) {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/kiosk/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qty,
          addons,
          phone,
          privilegeCode,
          receiptChannels: channels,
          deviceSlug: device?.slug ?? "",
          fulfilment,
          notes,
          orderNote,
        }),
      });
      const body = await res.json();

      if (!res.ok) {
        setError(body?.error || "We could not send that to the kitchen. Please try again.");
        return;
      }

      setConfirmation({
        id: body.id ?? null,
        code: body.code,
        count: body.count ?? totals.count,
        total: body.total ?? totals.total,
        saved: body.saved ?? totals.totalSaved,
        discount: body.discount ?? totals.privilegeDiscount,
        phone,
        privilege: body.privilege ?? null,
        trackUrl: body.id ? `${window.location.origin}/order/${body.id}` : "",
        /* Taken from the reply, not from what this screen chose: the server has
           the last word on whether a delivery was accepted. */
        fulfilment: body.fulfilment === "delivery" ? "delivery" : "pickup",
      });
      setScreen("done");
    } catch {
      setError("We could not reach the kitchen. Please try again, or order at the counter.");
    } finally {
      setSubmitting(false);
    }
  }

  /* ─── Which step the rail is on ───────────────────────────────────────── */

  const step: KioskStepKey =
    screen === "done"
      ? "done"
      : screen === "phone"
        ? "phone"
        : privilegeOpen
          ? "privilege"
          : reviewOpen
            ? "review"
            : "choose";

  const skip: KioskStepKey[] = [
    ...(settings.privilege_enabled ? [] : (["privilege"] as KioskStepKey[])),
    ...(settings.phone_enabled ? [] : (["phone"] as KioskStepKey[])),
  ];

  /* ─── Screens ─────────────────────────────────────────────────────────── */

  /* Either the whole kiosk is switched off, or this one panel has been taken
     out of service while the others keep selling. */
  const closed = !settings.is_live || device?.is_active === false;

  if (screen === "attract") {
    return (
      <AttractScreen
        settings={settings}
        ads={ads}
        lang={lang}
        onLang={setLang}
        deviceName={device ? deviceLabel(device) : ""}
        closedMessage={closed ? settings.closed_message : ""}
        onStart={() => setScreen("menu")}
      />
    );
  }

  return (
    /*
     * dir and the Arabic face hang here, not on the layout.
     *
     * The layout pins the whole route to English so a tablet set to Arabic
     * cannot mirror a screen nobody asked to be mirrored. The customer's own
     * choice is a different thing, and it belongs where the choice is kept.
     */
    <div
      className="kiosk-lang w-full h-full flex flex-col relative bg-white"
      dir={dirFor(lang)}
      lang={lang}
      onPointerDown={bumpIdle}
      onScroll={bumpIdle}
    >
      <KioskHeader
        brandName={settings.brand_name}
        brandSubtitle={settings.brand_subtitle}
        logoUrl={settings.logo_url || undefined}
        step={step}
        skip={skip}
        deviceName={device ? deviceLabel(device) : ""}
        lang={lang}
        onLang={setLang}
        t={t}
      />

      {screen === "menu" && (
        <MenuScreen
          t={t}
          lang={lang}
          settings={settings}
          categories={categories}
          items={items}
          qty={qty}
          totals={totals}
          onAdd={add}
          onLess={(item) => bump(item, -1)}
          onReview={() => setReviewOpen(true)}
          onAddCombo={addCombo}
        />
      )}

      {screen === "phone" && (
        <PhoneScreen
          t={t}
          settings={settings}
          totals={totals}
          privilege={privilege}
          fulfilment={fulfilment}
          onFulfilment={setFulfilment}
          orderNote={orderNote}
          onOrderNote={() => setNoting("order")}
          submitting={submitting}
          error={error}
          onBack={() => { setScreen("menu"); setReviewOpen(true); }}
          onDone={placeOrder}
        />
      )}

      {screen === "done" && confirmation && (
        <DoneScreen t={t} lang={lang} settings={settings} confirmation={confirmation} onReset={reset} />
      )}

      {/* ─── Panels over the menu ─── */}
      {screen === "menu" && reviewOpen && (
        <ReviewPanel
          t={t}
          lang={lang}
          totals={totals}
          addons={addons}
          notes={notes}
          privilege={privilege}
          privilegeEnabled={settings.privilege_enabled}
          onClose={() => setReviewOpen(false)}
          onMore={(item) => bump(item, 1)}
          onLess={(item) => bump(item, -1)}
          onEdit={(item) => setSheet({ item, editing: true })}
          onNote={(item) => setNoting(item)}
          onRemove={remove}
          onPrivilege={() => setPrivilegeOpen(true)}
          onDropPrivilege={() => { setPrivilege(null); setPrivilegeCode(""); }}
          onContinue={() => {
            if (settings.phone_enabled) {
              setScreen("phone");
              setReviewOpen(false);
            } else {
              placeOrder("", []);
            }
          }}
          continueLabel={settings.phone_enabled ? t("review.continue") : t("review.placeOrder")}
        />
      )}

      {screen === "menu" && sheet && (
        <OptionsSheet
          t={t}
          lang={lang}
          item={sheet.item}
          initialSelection={addons[sheet.item.id]}
          initialQty={sheet.editing ? qty[sheet.item.id] : 1}
          onCancel={() => setSheet(null)}
          onConfirm={(selection, chosenQty) => {
            setAddons((a) => ({ ...a, [sheet.item.id]: selection }));
            setQty((q) => ({ ...q, [sheet.item.id]: chosenQty }));
            setSheet(null);
          }}
        />
      )}

      {/* Sits outside the `screen === "menu"` panels: the same sheet is opened
          from the cart and again from the phone screen, and gating it on the
          menu would have made the order-wide note unreachable exactly where it
          is asked for. */}
      {noting && (
        <NoteSheet
          t={t}
          lang={lang}
          scope={noting === "order" ? "order" : "item"}
          subject={noting === "order" ? "" : kioskField(lang, noting, "name")}
          initial={noting === "order" ? orderNote : (notes[noting.id] ?? "")}
          onCancel={() => setNoting(null)}
          onSave={(note) => {
            if (noting === "order") {
              setOrderNote(note);
            } else {
              /* An empty note is dropped rather than stored blank, so the
                 order that reaches the kitchen carries only real instructions
                 and a cook is not reading past three empty lines. */
              setNotes((n) => (note ? { ...n, [noting.id]: note } : without(n, noting.id)));
            }
            setNoting(null);
          }}
        />
      )}

      {privilegeOpen && (
        <PrivilegeModal
          t={t}
          onCancel={() => setPrivilegeOpen(false)}
          onSkip={() => setPrivilegeOpen(false)}
          onApplied={(holder, code) => {
            setPrivilege(holder);
            setPrivilegeCode(code);
            setPrivilegeOpen(false);
          }}
        />
      )}

      {/* Ordering switched off in admin, mid-flow. Better a plain notice than a
          screen that takes an order the kitchen will never see. */}
      {closed && (
        <div
          className="absolute inset-0 z-[60] flex flex-col items-center justify-center p-[6vh] text-center"
          style={{ background: "rgba(255,255,255,0.97)" }}
        >
          <p className="font-black text-[3.4vh]" style={{ color: KIOSK.ink }}>
            {settings.closed_message}
          </p>
          <button
            onClick={reset}
            className="mt-[3vh] rounded-[1.4vh] px-[3vh] font-bold text-[1.9vh]"
            style={{ background: KIOSK.gold, color: KIOSK.onGold, height: "6.4vh" }}
          >
            Back
          </button>
        </div>
      )}
    </div>
  );
}
