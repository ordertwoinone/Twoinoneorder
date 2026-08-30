/**
 * The till's look, taken from the panels these screens were drawn from.
 *
 * Deliberately not the kiosk's gold or the website's orange. A customer-facing
 * screen is selling; this one is a tool, used for eight hours by someone who
 * needs to find the same button in the same place every time. Hence the deep
 * teal chrome and a single green for "this is the action".
 */
export const POS = {
  /** Chrome: the sidebar, the header bar, the login panel. */
  night: "#0E3A3F",
  nightSoft: "#14494F",
  /** The one colour a primary action is ever painted in. */
  action: "#0B4A44",
  actionDeep: "#083A35",
  /** The brand mark's orange. Accents only — never a button. */
  brand: "#E8622C",
  ink: "#111827",
  inkSoft: "#6B7280",
  line: "#E6E8EA",
  page: "#F6F7F8",
  good: "#16A34A",
  goodSoft: "#F0FDF4",
  warn: "#D97706",
  bad: "#DC2626",
  badSoft: "#FEF2F2",
} as const;

/** The tablets these run on are landscape, around this size. */
export const POS_CANVAS = { width: 1366, height: 1024 } as const;
