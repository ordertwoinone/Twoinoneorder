/**
 * The admin panel, cut into the areas a member can be given.
 *
 * One list, three readers: middleware decides whether a request may proceed,
 * the sidebar decides what to show, and admin → Team lists them as tick boxes.
 * A new admin screen belongs here the day it is added — a path no area claims
 * is treated as owner-only, so forgetting is safe rather than open.
 */

export interface AdminArea {
  key: string;
  label: string;
  /** What the member is trusted with, in their words. */
  hint: string;
  /** Page prefixes under /admin. */
  paths: string[];
  /** Route prefixes under /api/admin that serve those pages. */
  apiPaths: string[];
}

export const ADMIN_AREAS: AdminArea[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    hint: "The overview screen",
    paths: ["/admin/dashboard"],
    // The business report is the dashboard; whoever may open one may read both.
    apiPaths: ["/api/admin/dashboard", "/api/admin/report"],
  },
  {
    key: "live-orders",
    label: "Orders",
    hint: "take.app orders and every booking, on one board",
    /* /admin/bookings is kept as a path so the old link still resolves — it
       redirects here rather than 404ing for anyone who bookmarked it. */
    paths: ["/admin/live-orders", "/admin/bookings"],
    apiPaths: ["/api/admin/takeapp", "/api/admin/push", "/api/admin/bookings"],
  },
  {
    key: "order-history",
    label: "Order History",
    hint: "Past orders, payment method, and printing an invoice",
    /* Its own area rather than part of Orders. Someone who reconciles takings
       at the end of a shift has no business on the live board, and the person
       working the live board does not need the ledger. */
    paths: ["/admin/order-history", "/admin/invoice/"],
    apiPaths: ["/api/admin/bookings"],
  },
  {
    key: "invoice-settings",
    label: "Invoice Design",
    hint: "The wording and layout printed on a tax invoice",
    paths: ["/admin/invoice-settings"],
    apiPaths: ["/api/admin/invoice-settings"],
  },
  {
    key: "shipday",
    label: "Delivery Tracking",
    hint: "Following a delivery, and the Shipday dispatch board behind it",
    /* /admin/shipday is off the sidebar but still reachable by URL, so it stays
       claimed here — an unclaimed path would silently become owner-only. */
    paths: ["/admin/shipday", "/admin/delivery-tracking"],
    apiPaths: ["/api/admin/shipday"],
  },
  {
    key: "booking-tables",
    label: "Table Details",
    hint: "The /book-table floor plan",
    paths: ["/admin/booking-tables"],
    apiPaths: ["/api/admin/booking-tables"],
  },
  {
    key: "customers",
    label: "Customers",
    hint: "Signed-up customer accounts",
    paths: ["/admin/users"],
    apiPaths: [],
  },
  {
    key: "restaurant-menu",
    label: "Restaurant Menus",
    hint: "Imported storefront menus and top picks",
    paths: ["/admin/restaurant-menu"],
    apiPaths: ["/api/admin/restaurant-menu"],
  },
  {
    key: "homepage",
    label: "Homepage",
    hint: "Restaurants, banners, categories, offers, promos",
    paths: [
      "/admin/restaurants",
      "/admin/banners",
      "/admin/home-categories",
      "/admin/offers",
      "/admin/trust-badges",
      "/admin/campus-promo",
      "/admin/homepage-cards",
      "/admin/home-sections",
    ],
    apiPaths: [
      "/api/admin/restaurants",
      "/api/admin/banners",
      "/api/admin/home-categories",
      "/api/admin/offers",
      "/api/admin/trust-badges",
      "/api/admin/campus-promo",
      "/api/admin/homepage-cards",
      // Home Sections stores its two headings on the site_settings row.
      "/api/admin/settings",
    ],
  },
  {
    key: "buffet",
    label: "Buffet Page",
    hint: "Hero, banners, timings, dishes, about, photos, reviews",
    paths: ["/admin/buffet/", "/admin/buffet-highlights"],
    apiPaths: ["/api/admin/buffet/", "/api/admin/buffet-highlights"],
  },
  {
    key: "buffet-menu",
    label: "Buffet Menu",
    hint: "Buffet menu sections and items",
    paths: ["/admin/buffet-menu"],
    apiPaths: ["/api/admin/buffet-menu"],
  },
  {
    key: "kalba",
    label: "University Kalba",
    hint: "The Kalba branch page and its coupons",
    paths: ["/admin/kalba"],
    apiPaths: ["/api/admin/kalba"],
  },
  {
    key: "contact",
    label: "Contact Page",
    hint: "Contact details and map locations",
    paths: ["/admin/contact-details", "/admin/contact-locations"],
    apiPaths: ["/api/admin/contact-details", "/api/admin/contact-locations"],
  },
  {
    key: "header",
    label: "Header",
    hint: "Site wordmark, tagline and logo",
    paths: ["/admin/header"],
    // The header's fields live on the site_settings row, so it reads and
    // writes the settings endpoint — there is no /api/admin/header.
    apiPaths: ["/api/admin/header", "/api/admin/settings"],
  },
  {
    key: "student-card",
    label: "Student Card",
    hint: "The wording and colours of the Student Privilege Card",
    paths: ["/admin/student-card"],
    apiPaths: ["/api/admin/student-card-design"],
  },
  {
    key: "spin-wheel",
    label: "Spin & Win",
    hint: "The prize wheel and its entries",
    paths: ["/admin/spin-wheel"],
    apiPaths: ["/api/admin/spin-wheel"],
  },
  {
    key: "media",
    label: "Media Library",
    hint: "Uploading and managing images",
    paths: ["/admin/media"],
    apiPaths: ["/api/admin/media", "/api/admin/upload"],
  },
  {
    key: "settings",
    label: "Settings",
    hint: "Site-wide settings",
    paths: ["/admin/settings"],
    apiPaths: ["/api/admin/settings"],
  },
];

/** Managing the team is the owner's alone, so it is not a grantable area. */
export const OWNER_ONLY_PATHS = ["/admin/team", "/api/admin/team"];

/**
 * Open to every member whatever their areas: the login screen, the no-access
 * notice, and the housekeeping routes any screen may call — reading your own
 * access, signing out, and flushing the public cache after an edit.
 *
 * Uploading is here for the same reason. Nearly every content screen has an
 * image field, so filing it under Media alone meant a member who could edit
 * the Kalba menu could not put a photo on a dish. Browsing and deleting the
 * library stays behind the Media area; putting a file in does not.
 */
export const MEMBER_PATHS = [
  "/admin",
  "/admin/no-access",
  "/api/admin/me",
  "/api/admin/auth/logout",
  "/api/admin/revalidate",
  "/api/admin/upload",
];

function matches(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`) || pathname.startsWith(prefix));
}

/**
 * Every area that claims a path, not just the first.
 *
 * Some endpoints genuinely belong to more than one screen — admin → Header and
 * admin → Home Sections both write site_settings, and half the panel uploads
 * images. Answering with only the first match meant whoever held the *other*
 * area was refused their own screen's save.
 */
export function areasForPath(pathname: string): AdminArea[] {
  return ADMIN_AREAS.filter(
    (area) => matches(pathname, area.paths) || matches(pathname, area.apiPaths),
  );
}

/** The area a path is filed under, for labelling and for the sidebar. */
export function areaForPath(pathname: string): AdminArea | null {
  return areasForPath(pathname)[0] ?? null;
}

export function isOwnerOnlyPath(pathname: string): boolean {
  return matches(pathname, OWNER_ONLY_PATHS);
}

export function isMemberPath(pathname: string): boolean {
  return MEMBER_PATHS.some((p) => pathname === p);
}

/** Whether a member may open a path, given the areas they hold. */
export function canAccess(
  pathname: string,
  member: { isOwner: boolean; areas: string[] },
): boolean {
  if (member.isOwner) return true;
  if (isMemberPath(pathname)) return true;
  if (isOwnerOnlyPath(pathname)) return false;

  const claiming = areasForPath(pathname);
  // An unclaimed path is owner-only: a screen added without being listed here
  // stays shut rather than open to everyone.
  if (claiming.length === 0) return false;
  // Any one of them is enough — a shared endpoint is shared.
  return claiming.some((area) => member.areas.includes(area.key));
}

/** Where to send a member who landed somewhere they may not open. */
export function landingPath(member: { isOwner: boolean; areas: string[] }): string {
  if (member.isOwner) return "/admin/dashboard";
  const first = ADMIN_AREAS.find((area) => member.areas.includes(area.key));
  return first ? first.paths[0] : "/admin/no-access";
}
