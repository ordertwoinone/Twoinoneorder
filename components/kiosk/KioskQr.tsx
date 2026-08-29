"use client";

import { useEffect, useState } from "react";

/**
 * The square on the confirmation screen.
 *
 * Drawn in the browser rather than fetched, so a kiosk whose network has gone
 * out between placing the order and printing the screen still shows one. Error
 * correction is set high because this is read off a glossy panel under café
 * lighting, often at an angle.
 */
export default function KioskQr({
  value,
  size = 220,
  className,
}: {
  value: string;
  size?: number;
  className?: string;
}) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (!value) {
      setSrc("");
      return;
    }
    // Imported here rather than at module scope: it is a browser-only encoder,
    // and the screen renders on the server first.
    import("qrcode")
      .then((QRCode) =>
        QRCode.toDataURL(value, {
          errorCorrectionLevel: "H",
          margin: 1,
          width: size * 2,
          color: { dark: "#111827", light: "#FFFFFF" },
        }),
      )
      .then((url) => { if (!cancelled) setSrc(url); })
      .catch(() => { /* the order number beside it is the part that matters */ });
    return () => { cancelled = true; };
  }, [value, size]);

  if (!src) {
    return <div className={className} style={{ width: size, height: size, background: "#F4F4F4", borderRadius: 8 }} />;
  }

  /* eslint-disable-next-line @next/next/no-img-element */
  return <img src={src} alt="" className={className} style={{ width: size, height: size }} />;
}
