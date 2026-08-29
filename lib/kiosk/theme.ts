/**
 * The kiosk's own look.
 *
 * Deliberately not the website's orange. A screen standing in the room is read
 * from two metres away by someone walking past, so it runs on the brand's gold
 * against near-black — the palette the panels were designed in. Keeping the
 * values here rather than scattered through the components means the whole
 * screen re-skins from one file.
 */

export const KIOSK = {
  /** The one colour every action on the screen is painted in. */
  gold: "#FFC629",
  goldDeep: "#E9AE07",
  goldSoft: "#FFF6DB",
  /** Text on gold. Near-black rather than pure, which glares on a bright panel. */
  onGold: "#1A1A1A",
  ink: "#111827",
  inkSoft: "#6B7280",
  line: "#EDEDED",
  /** The attract screen's ground, behind the food. */
  night: "#0B0B0B",
  good: "#16A34A",
  bad: "#DC2626",
} as const;

/**
 * The panel these screens were drawn for: a 1080 × 1920 portrait display.
 *
 * Nothing is pinned to it — every size below is relative, so the same build
 * fills a 768 × 1366 or a 1200 × 1920 without a second layout. It is here so
 * the numbers have a stated origin.
 */
export const KIOSK_CANVAS = { width: 1080, height: 1920 } as const;

/**
 * Type and spacing, as a share of the viewport's shorter edge.
 *
 * `cqi`-style sizing without the container query: 1vw of a 1080-wide panel is
 * 10.8px, so a heading at 5.5vw reads at 59px there and scales in proportion
 * on anything else. Touch targets stay in px — a thumb is the same size
 * whatever the panel is.
 */
export const TOUCH_MIN = 64;
