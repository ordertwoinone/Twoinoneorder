import type { Metadata, Viewport } from "next";

/**
 * The self-order kiosk screen.
 *
 * It runs outside the rest of the site's chrome — no navbar, no footer, no
 * bottom nav — because it is not a page someone browsed to. It is the whole of
 * what a display standing in the branch shows, all day, to whoever walks up.
 *
 * The panel is portrait, so everything below is built for a tall screen and
 * fills whatever it is given: 1080 × 1920 is what it was drawn for.
 */
export const metadata: Metadata = {
  title: "Order Here",
  // A screen in a room has no business in search results.
  robots: { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // A kiosk that can be pinch-zoomed is a kiosk left zoomed in by a passer-by.
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0B0B0B",
};

export default function KioskLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Scoped to this route rather than globals.css: every rule here is
          hostile on an ordinary page. Nothing is selectable, nothing rubber-
          bands, and a long press opens no menu — all three are how a public
          screen ends up stuck in a state nobody can get it out of. */}
      <style>{`
        .kiosk-root {
          position: fixed;
          inset: 0;
          overflow: hidden;
          background: #ffffff;
          -webkit-user-select: none;
          user-select: none;
          -webkit-touch-callout: none;
          -webkit-tap-highlight-color: transparent;
          overscroll-behavior: none;
          touch-action: manipulation;
        }
        .kiosk-root *:focus { outline: none; }
        /* The one thing that does take a caret: the phone number field. */
        .kiosk-root input { -webkit-user-select: text; user-select: text; }
        .kiosk-scroll {
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
          scrollbar-width: none;
        }
        .kiosk-scroll::-webkit-scrollbar { display: none; }

        /* Print Receipt drives the panel's own printer through the browser.
           Without this the page prints as a cropped photograph of a fixed,
           clipped screen — so on paper it stops being a screen and becomes a
           document: it flows, it is black on white, and the buttons that only
           make sense to a finger are left off. */
        @media print {
          .kiosk-root {
            position: static;
            overflow: visible;
            height: auto;
          }
          .kiosk-scroll { overflow: visible !important; }
          .kiosk-no-print { display: none !important; }
        }
      `}</style>
      <div className="kiosk-root">{children}</div>
    </>
  );
}
