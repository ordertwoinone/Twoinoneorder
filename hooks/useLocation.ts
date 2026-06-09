"use client";
import { useState } from "react";

export type LocationState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "granted"; area: string }
  | { status: "denied" }
  | { status: "error"; message: string };

async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    const addr = data.address;
    const area =
      addr.neighbourhood ||
      addr.suburb ||
      addr.city_district ||
      addr.town ||
      addr.city ||
      "Your Area";
    const city = addr.city || addr.state || "";
    return city ? `${area}, ${city}` : area;
  } catch {
    return "Dubai, UAE";
  }
}

export function useLocation() {
  const [location, setLocation] = useState<LocationState>({ status: "idle" });

  const detect = () => {
    if (!navigator.geolocation) {
      setLocation({ status: "error", message: "Geolocation not supported" });
      return;
    }
    setLocation({ status: "loading" });
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const area = await reverseGeocode(
          pos.coords.latitude,
          pos.coords.longitude
        );
        setLocation({ status: "granted", area });
      },
      () => setLocation({ status: "denied" }),
      { timeout: 8000 }
    );
  };

  return { location, detect };
}
