"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, ExternalLink, RefreshCw, Truck, X } from "lucide-react";
import {
  TRACKING_STORES,
  buildTrackingUrl,
  parseTracking,
  storeForHost,
} from "@/lib/order-tracking";

/**
 * admin → Delivery Tracking.
 *
 * Each restaurant publishes its own live tracking page — driver, ETA, the route
 * on a map — so this frames whichever one the order belongs to rather than
 * rebuilding it. What it adds is the way in.
 *
 * The restaurant has to be part of that: an order id only resolves on the
 * storefront it was placed at, and the same id on another is a 404. Pasting a
 * whole link fills both in, because the link names the store in its host.
 */

const RECENT_KEY = "tio-recent-tracking";
const RECENT_LIMIT = 6;

interface Recent {
  id: string;
  host: string;
}

function DeliveryTracking() {
  const router = useRouter();
  const params = useSearchParams();

  const trackedId = (params.get("id") ?? "").trim();
  const trackedHost = (params.get("store") ?? "").trim().toLowerCase();

  const [input, setInput] = useState(trackedId);
  const [host, setHost] = useState(trackedHost || TRACKING_STORES[0].host);
  const [recent, setRecent] = useState<Recent[]>([]);
  /* Bumped to force the frame to reload on Refresh. Changing the key remounts
     the iframe, which is the only way to reload a cross-origin document. */
  const [reloads, setReloads] = useState(0);

  // Keep the controls in step when the query string changes underneath them.
  useEffect(() => { setInput(trackedId); }, [trackedId]);
  useEffect(() => { if (trackedHost) setHost(trackedHost); }, [trackedHost]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
      if (Array.isArray(saved)) {
        setRecent(saved.filter((r) => r && typeof r.id === "string" && typeof r.host === "string"));
      }
    } catch {
      /* A corrupted list is not worth a broken screen. */
    }
  }, []);

  const remember = useCallback((entry: Recent) => {
    setRecent((list) => {
      const next = [entry, ...list.filter((r) => r.id !== entry.id)].slice(0, RECENT_LIMIT);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        /* Private mode. The screen still works, it just will not remember. */
      }
      return next;
    });
  }, []);

  function track(raw: string, preferredHost?: string) {
    const parsed = parseTracking(raw);
    if (!parsed.id) return;

    /* A pasted link names its own store, and that beats the dropdown — it is
       the more specific answer, and correcting the picker afterwards would be
       one more thing to remember. */
    const store = parsed.host || preferredHost || host;
    setHost(store);
    remember({ id: parsed.id, host: store });
    router.replace(
      `/admin/delivery-tracking?id=${encodeURIComponent(parsed.id)}&store=${encodeURIComponent(store)}`,
    );
  }

  function clearRecent() {
    setRecent([]);
    try {
      localStorage.removeItem(RECENT_KEY);
    } catch {
      /* nothing to clear */
    }
  }

  const url = buildTrackingUrl(trackedId, trackedHost || host);
  const trackedStore = storeForHost(trackedHost);

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1">
            Deliveries
          </p>
          <h1 className="text-2xl font-semibold text-gray-900">Delivery Tracking</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {trackedStore
              ? `Following an order at ${trackedStore.label}`
              : "Follow a delivery on the restaurant's live tracking page"}
          </p>
        </div>
        {url && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setReloads((n) => n + 1)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50"
            >
              <RefreshCw size={14} />
              Refresh
            </button>
            {/* The frame is the convenience; the real page is one click away
                and is what to send a driver or a customer. */}
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white"
              style={{ background: "#ea580c" }}
            >
              <ExternalLink size={14} />
              Open full page
            </a>
          </div>
        )}
      </div>

      {/* The way in */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
        <label htmlFor="tracking-id" className="block text-sm font-semibold text-gray-900">
          Order tracking
        </label>
        <p className="text-[13px] text-gray-500 mt-0.5 mb-3">
          Paste the tracking link and the restaurant is read from it. Paste a bare order ID and
          pick the restaurant it was placed at — the same ID does not resolve on another.
        </p>

        <div className="flex flex-wrap gap-2">
          <select
            value={host}
            onChange={(e) => setHost(e.target.value)}
            aria-label="Restaurant"
            className="px-3 py-3 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            {TRACKING_STORES.map((s) => (
              <option key={s.host} value={s.host}>{s.label}</option>
            ))}
          </select>

          <div className="relative flex-1 min-w-[220px]">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              id="tracking-id"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && track(input)}
              placeholder="Paste tracking link or order ID"
              dir="ltr"
              className="w-full pl-10 pr-3 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          <button
            onClick={() => track(input)}
            disabled={!parseTracking(input).id}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: "#ea580c" }}
          >
            <Search size={15} />
            Track
          </button>
        </div>

        {recent.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
              Recent
            </span>
            {recent.map((r) => (
              <button
                key={`${r.host}:${r.id}`}
                onClick={() => track(r.id, r.host)}
                title={storeForHost(r.host)?.label ?? r.host}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                  r.id === trackedId
                    ? "bg-orange-100 text-orange-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <span className="font-normal opacity-70">
                  {storeForHost(r.host)?.label ?? r.host} ·{" "}
                </span>
                <span className="font-mono">{r.id.slice(-8)}</span>
              </button>
            ))}
            <button
              onClick={clearRecent}
              aria-label="Clear recent deliveries"
              className="w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            >
              <X size={13} />
            </button>
          </div>
        )}
      </div>

      {/* The delivery */}
      {url ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <iframe
            key={`${trackedHost}:${trackedId}:${reloads}`}
            src={url}
            title={`Delivery ${trackedId}`}
            className="w-full h-[78vh] min-h-[560px] border-0"
            /* Its own origin, and it needs scripts to draw the driver moving.
               Nothing in the sandbox may reach back into the panel. */
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            referrerPolicy="no-referrer-when-downgrade"
            allow="geolocation"
          />
          <p className="px-5 py-3 text-[11px] text-gray-400 border-t border-gray-100">
            Live from {trackedStore?.label ?? "the storefront"}. If the frame stays blank, use{" "}
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-orange-600 hover:underline"
            >
              Open full page
            </a>{" "}
            — some browsers block third-party frames outright.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-16 text-center">
          <Truck size={30} className="mx-auto text-gray-300" />
          <p className="text-sm font-semibold text-gray-700 mt-3">No delivery being tracked</p>
          <p className="text-[13px] text-gray-500 mt-1 max-w-lg mx-auto">
            Every take.app order on the Orders board has a Track button that opens straight here,
            already pointed at the right restaurant. Or paste a link above.
          </p>
          <div className="mt-5 inline-flex flex-col gap-1 text-[11px] text-gray-400 font-mono">
            {TRACKING_STORES.map((s) => (
              <span key={s.host}>
                {s.label}: {s.host}.twoinoneorder.com
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DeliveryTrackingPage() {
  // useSearchParams needs a boundary, or the whole route opts out of prerender.
  return (
    <Suspense fallback={<div className="p-8 text-sm text-gray-400">Loading…</div>}>
      <DeliveryTracking />
    </Suspense>
  );
}
