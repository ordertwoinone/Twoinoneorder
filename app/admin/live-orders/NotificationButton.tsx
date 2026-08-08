"use client";
import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";

/**
 * Turns notifications on for this device.
 *
 * Per device, not per person: a phone, a laptop and the installed home-screen
 * app are three separate subscriptions even for the same admin. Permission can
 * only be asked from a click, which is why this is a button and not something
 * the page does on load.
 */

type State = "checking" | "unsupported" | "blocked" | "off" | "on" | "working";

/**
 * The VAPID public key travels as base64url and must reach the browser as
 * bytes. Built on an explicit ArrayBuffer, which is what PushManager's types
 * insist on — a plain Uint8Array may be backed by a SharedArrayBuffer.
 */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const raw = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export default function NotificationButton() {
  const [state, setState] = useState<State>("checking");
  const [note, setNote] = useState("");

  const supported = useCallback(
    () => typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window,
    [],
  );

  useEffect(() => {
    if (!supported()) { setState("unsupported"); return; }
    if (Notification.permission === "denied") { setState("blocked"); return; }

    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setState(sub ? "on" : "off"))
      .catch(() => setState("off"));
  }, [supported]);

  async function enable() {
    setState("working");
    setNote("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "blocked" : "off");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) {
        setNote("The server has no push key configured.");
        setState("off");
        return;
      }

      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(key),
        }));

      const res = await fetch("/api/admin/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Could not register this device.");

      setState("on");
      setNote("This device will be notified even with the app closed.");
    } catch (err) {
      setState("off");
      setNote(err instanceof Error ? err.message : "Could not turn notifications on.");
    }
  }

  async function disable() {
    setState("working");
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/admin/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setState("off");
      setNote("");
    } catch {
      setState("on");
    }
  }

  async function sendTest() {
    setNote("Sending…");
    const res = await fetch("/api/admin/push/test", { method: "POST" });
    const body = await res.json().catch(() => null);
    setNote(body?.message ?? "Could not send the test.");
  }

  if (state === "unsupported") {
    return (
      <span className="text-[11px] text-gray-400 sm:max-w-[220px]">
        This browser cannot do notifications. On iPhone, add the app to the Home Screen first.
      </span>
    );
  }

  return (
    /* The row shares the header's wrapping line, so it must not force its own:
       full width on a phone, only as wide as its buttons from sm up. */
    <div className="flex flex-col gap-1 w-full sm:w-auto">
      <div className="flex items-center gap-2">
        {state === "on" && (
          <button
            onClick={sendTest}
            className="px-3 h-11 rounded-lg text-sm font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition shrink-0"
          >
            Test
          </button>
        )}
        <button
          onClick={state === "on" ? disable : enable}
          disabled={state === "working" || state === "checking" || state === "blocked"}
          className={`flex flex-1 sm:flex-none items-center justify-center gap-2 px-4 h-11 rounded-lg text-sm font-semibold border transition disabled:opacity-60 ${
            state === "on"
              ? "bg-green-50 border-green-200 text-green-700"
              : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          {state === "working" || state === "checking" ? (
            <Loader2 size={14} className="animate-spin" />
          ) : state === "on" ? (
            <BellRing size={14} />
          ) : state === "blocked" ? (
            <BellOff size={14} />
          ) : (
            <Bell size={14} />
          )}
          {state === "on"
            ? "Notifications on"
            : state === "blocked"
              ? "Notifications blocked"
              : "Notify me"}
        </button>
      </div>

      {state === "blocked" && (
        <span className="text-[11px] text-gray-400 sm:max-w-[240px] sm:text-right">
          Blocked in the browser settings for this site — allow notifications there, then reload.
        </span>
      )}
      {note && <span className="text-[11px] text-gray-400 sm:max-w-[240px] sm:text-right">{note}</span>}
    </div>
  );
}
