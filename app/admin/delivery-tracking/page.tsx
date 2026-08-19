"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, ExternalLink, RefreshCw, Truck, X } from "lucide-react";
import { TRACKING_BASE_URL, trackingIdFrom, trackingUrl } from "@/lib/order-tracking";

/**
 * admin → Delivery Tracking.
 *
 * Shipday already publishes a live tracking page per delivery — driver, ETA,
 * the route on a map — so this frames that rather than rebuilding it against
 * an API that would drift out of step with it. What it adds is the way in: a
 * box to paste an id into, and a link a colleague can be sent.
 *
 * The id lives in the query string so a tracked delivery can be bookmarked,
 * reopened, or linked to from the Shipday board.
 */

const RECENT_KEY = "tio-recent-tracking-ids";
const RECENT_LIMIT = 6;

function DeliveryTracking() {
  const router = useRouter();
  const params = useSearchParams();
  const tracked = trackingIdFrom(params.get("id") ?? "");

  const [input, setInput] = useState(tracked);
  const [recent, setRecent] = useState<string[]>([]);
  /* Bumped to force the frame to reload on Refresh. Changing the key remounts
     the iframe, which is the only way to reload a cross-origin document. */
  const [reloads, setReloads] = useState(0);

  // Keep the box in step when the query string changes underneath it.
  useEffect(() => { setInput(tracked); }, [tracked]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
      if (Array.isArray(saved)) setRecent(saved.filter((v) => typeof v === "string"));
    } catch {
      /* A corrupted list is not worth a broken screen. */
    }
  }, []);

  const remember = useCallback((id: string) => {
    setRecent((list) => {
      const next = [id, ...list.filter((v) => v !== id)].slice(0, RECENT_LIMIT);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        /* Private mode. The screen still works, it just will not remember. */
      }
      return next;
    });
  }, []);

  function track(raw: string) {
    const id = trackingIdFrom(raw);
    if (!id) return;
    remember(id);
    router.replace(`/admin/delivery-tracking?id=${encodeURIComponent(id)}`);
  }

  function clearRecent() {
    setRecent([]);
    try {
      localStorage.removeItem(RECENT_KEY);
    } catch {
      /* nothing to clear */
    }
  }

  const url = tracked ? trackingUrl(tracked) : "";

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1">
            Shipday
          </p>
          <h1 className="text-2xl font-semibold text-gray-900">Delivery Tracking</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Follow a delivery on Shipday&apos;s live tracking page
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
          Tracking ID
        </label>
        <p className="text-[13px] text-gray-500 mt-0.5 mb-3">
          Paste the tracking ID, or the whole tracking link — either works.
        </p>

        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              id="tracking-id"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && track(input)}
              placeholder="Paste tracking ID here"
              dir="ltr"
              className="w-full pl-10 pr-3 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <button
            onClick={() => track(input)}
            disabled={!trackingIdFrom(input)}
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
            {recent.map((id) => (
              <button
                key={id}
                onClick={() => track(id)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold font-mono transition-colors ${
                  id === tracked
                    ? "bg-orange-100 text-orange-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {id}
              </button>
            ))}
            <button
              onClick={clearRecent}
              aria-label="Clear recent tracking IDs"
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
            key={`${tracked}:${reloads}`}
            src={url}
            title={`Delivery ${tracked}`}
            className="w-full h-[78vh] min-h-[560px] border-0"
            /* Its own origin, and it needs scripts to draw the driver moving.
               Nothing in the sandbox may reach back into the panel. */
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            referrerPolicy="no-referrer-when-downgrade"
            allow="geolocation"
          />
          <p className="px-5 py-3 text-[11px] text-gray-400 border-t border-gray-100">
            Live from Shipday. If the frame stays blank, use{" "}
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
          <p className="text-[13px] text-gray-500 mt-1 max-w-md mx-auto">
            Paste a tracking ID above. Shipday shows the driver, the route and the ETA on its own
            live page, and this frames it so you never leave the panel.
          </p>
          <p className="text-[11px] text-gray-400 mt-4 font-mono break-all">
            {TRACKING_BASE_URL}/&lt;tracking-id&gt;
          </p>
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
