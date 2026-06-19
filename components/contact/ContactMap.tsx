"use client";
import { useEffect, useRef, useState } from "react";
import { MapPin, ArrowUpRight } from "lucide-react";
import "leaflet/dist/leaflet.css";

export interface ContactLocation {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  maps_url: string;
}

const PIN_HTML = `
  <div style="position:relative;width:30px;height:30px;transform:translate(-50%,-100%)">
    <svg viewBox="0 0 24 24" width="30" height="30" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,0.35))">
      <path fill="#ea580c" stroke="#fff" stroke-width="1.5"
        d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7z"/>
      <circle cx="12" cy="9" r="2.6" fill="#fff"/>
    </svg>
  </div>`;

export default function ContactMap({ locations }: { locations: ContactLocation[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<Record<string, any>>({});
  const [activeId, setActiveId] = useState<string | null>(locations[0]?.id ?? null);

  useEffect(() => {
    if (!containerRef.current || locations.length === 0) return;
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        scrollWheelZoom: false,
        zoomControl: true,
      });
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      const icon = L.divIcon({ html: PIN_HTML, className: "", iconSize: [30, 30], iconAnchor: [15, 30] });
      const latlngs: [number, number][] = [];

      locations.forEach((loc) => {
        const marker = L.marker([loc.latitude, loc.longitude], { icon })
          .addTo(map)
          .bindPopup(
            `<div style="font-family:system-ui,sans-serif;min-width:140px">
               <p style="font-weight:800;font-size:13px;color:#111;margin:0 0 2px">${loc.name}</p>
               <p style="font-size:11px;color:#6b7280;margin:0 0 6px">${loc.address || ""}</p>
               <a href="${loc.maps_url || `https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`}"
                  target="_blank" rel="noopener noreferrer"
                  style="font-size:11px;font-weight:700;color:#ea580c;text-decoration:none">Open in Maps →</a>
             </div>`
          );
        marker.on("click", () => setActiveId(loc.id));
        markersRef.current[loc.id] = marker;
        latlngs.push([loc.latitude, loc.longitude]);
      });

      if (latlngs.length === 1) {
        map.setView(latlngs[0], 15);
      } else {
        map.fitBounds(latlngs, { padding: [40, 40] });
      }
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersRef.current = {};
      }
    };
  }, [locations]);

  function focusLocation(loc: ContactLocation) {
    setActiveId(loc.id);
    const map = mapRef.current;
    const marker = markersRef.current[loc.id];
    if (map && marker) {
      map.flyTo([loc.latitude, loc.longitude], 16, { duration: 0.8 });
      marker.openPopup();
    }
  }

  if (locations.length === 0) return null;

  const active = locations.find((l) => l.id === activeId) ?? locations[0];

  return (
    <div className="rounded-3xl border border-gray-100 shadow-sm overflow-hidden bg-white">
      {/* Branch chips */}
      <div className="flex gap-2 overflow-x-auto p-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {locations.map((loc) => {
          const on = loc.id === activeId;
          return (
            <button
              key={loc.id}
              onClick={() => focusLocation(loc)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors ${
                on ? "bg-orange-500 text-white" : "bg-orange-50 text-orange-700 hover:bg-orange-100"
              }`}
            >
              <MapPin size={12} />
              {loc.name}
            </button>
          );
        })}
      </div>

      {/* Map */}
      <div ref={containerRef} className="w-full h-64 sm:h-80 z-0" />

      {/* Active branch footer */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-t border-gray-100">
        <MapPin size={16} className="text-orange-500 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-900 truncate">{active.name}</p>
          <p className="text-[12px] text-gray-500 truncate">{active.address}</p>
        </div>
        <a
          href={active.maps_url || `https://www.google.com/maps/search/?api=1&query=${active.latitude},${active.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 flex items-center gap-1 text-[12px] font-semibold text-orange-600 hover:text-orange-700"
        >
          Open in Maps <ArrowUpRight size={13} />
        </a>
      </div>
    </div>
  );
}
