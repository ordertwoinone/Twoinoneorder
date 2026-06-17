"use client";

import { useEffect } from "react";
import Script from "next/script";

export interface TrackingProps {
  metaPixelId?: string;
  gaMeasurementId?: string;
  gtmId?: string;
  headScripts?: string;
}

/**
 * Injects analytics / marketing tags based on the IDs saved in Site Settings.
 * Each block only renders when its ID is present, so adding an ID in the admin
 * panel turns the corresponding tracking on automatically.
 */
export default function TrackingScripts({
  metaPixelId,
  gaMeasurementId,
  gtmId,
  headScripts,
}: TrackingProps) {
  const pixel = metaPixelId?.trim();
  const ga = gaMeasurementId?.trim();
  const gtm = gtmId?.trim();
  const custom = headScripts?.trim();

  // Custom "other tags" — inject raw HTML so <script> tags actually execute.
  useEffect(() => {
    if (!custom) return;
    const tmp = document.createElement("div");
    tmp.innerHTML = custom;
    const added: Node[] = [];
    Array.from(tmp.childNodes).forEach((node) => {
      if (node.nodeName === "SCRIPT") {
        const src = node as HTMLScriptElement;
        const s = document.createElement("script");
        Array.from(src.attributes).forEach((a) => s.setAttribute(a.name, a.value));
        s.textContent = src.textContent;
        document.head.appendChild(s);
        added.push(s);
      } else {
        document.head.appendChild(node);
        added.push(node);
      }
    });
    return () => added.forEach((n) => { try { n.parentNode?.removeChild(n); } catch { /* noop */ } });
  }, [custom]);

  return (
    <>
      {/* Google Tag Manager */}
      {gtm && (
        <>
          <Script id="gtm-init" strategy="afterInteractive">
            {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtm}');`}
          </Script>
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtm}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
              title="gtm"
            />
          </noscript>
        </>
      )}

      {/* Google Analytics (GA4) */}
      {ga && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga}`} strategy="afterInteractive" />
          <Script id="ga-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${ga}');`}
          </Script>
        </>
      )}

      {/* Meta (Facebook) Pixel */}
      {pixel && (
        <>
          <Script id="fb-pixel" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixel}');fbq('track','PageView');`}
          </Script>
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              alt=""
              src={`https://www.facebook.com/tr?id=${pixel}&ev=PageView&noscript=1`}
            />
          </noscript>
        </>
      )}
    </>
  );
}
