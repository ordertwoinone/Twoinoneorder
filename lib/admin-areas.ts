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
    apiPaths: ["/api/admin/dashboard"],
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
    ],
    apiPaths: [
      "/api/admin/restaurants",
      "/api/admin/banners",
      "/api/admin/home-categories",
      "/api/admin/offers",
      "/api/admin/trust-badges",
      "/api/admin/campus-promo",
      "/api/admin/homepage-cards",
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
    apiPaths: ["/api/admin/header"],
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
 */
export const MEMBER_PATHS = [
  "/admin",
  "/admin/no-access",
  "/api/admin/me",
  "/api/admin/auth/logout",
  "/api/admin/revalidate",
];

function matches(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`) || pathname.startsWith(prefix));
}

/** The area a request belongs to, or null when no area claims it. */
export function areaForPath(pathname: string): AdminArea | null {
  return (
    ADMIN_AREAS.find((area) => matches(pathname, area.paths) || matches(pathname, area.apiPaths)) ?? null
  );
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

  const area = areaForPath(pathname);
  // An unclaimed path is owner-only: a screen added without being listed here
  // stays shut rather than open to everyone.
  if (!area) return false;
  return member.areas.includes(area.key);
}

/** Where to send a member who landed somewhere they may not open. */
export function landingPath(member: { isOwner: boolean; areas: string[] }): string {
  if (member.isOwner) return "/admin/dashboard";
  const first = ADMIN_AREAS.find((area) => member.areas.includes(area.key));
  return first ? first.paths[0] : "/admin/no-access";
}
