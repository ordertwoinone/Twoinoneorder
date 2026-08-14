"use client";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Store, LogOut, LayoutDashboard, Image as ImageIcon, Tag, Settings,
  Images, Home, ChevronDown, Clock, Utensils, Star, UtensilsCrossed,
  BookOpen, List, GraduationCap, Info, Grid3x3,
  Armchair, CalendarDays, Gift, Percent, MapPin, LayoutGrid, Menu, X,
  Disc3, ShieldCheck, Phone, PanelTop, UsersRound, Radio, KeyRound, Truck,
  CreditCard, Sparkles, Receipt, History,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { LucideIcon } from "lucide-react";
import { areaForPath, isOwnerOnlyPath } from "@/lib/admin-areas";

type NavChild = { label: string; href: string; icon: LucideIcon };
type NavItem =
  | { label: string; href: string; icon: LucideIcon }
  | { label: string; icon: LucideIcon; basePath: string; children: NavChild[] };

/** The signed-in member's own access, as /api/admin/me reports it. */
interface Access {
  name: string;
  email: string;
  areas: string[];
  isOwner: boolean;
}

const NAV: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Orders", href: "/admin/live-orders", icon: Radio },
  { label: "Order History", href: "/admin/order-history", icon: History },
  { label: "Invoice", href: "/admin/invoice-settings", icon: Receipt },
  { label: "Shipday Delivery", href: "/admin/shipday", icon: Truck },
  { label: "Restaurant Menus", href: "/admin/restaurant-menu", icon: BookOpen },
  {
    label: "Homepage",
    icon: Home,
    basePath: "/admin/homepage-section",
    children: [
      { label: "Restaurants",       href: "/admin/restaurants",       icon: Store       },
      { label: "Hero Banners",      href: "/admin/banners",           icon: ImageIcon   },
      { label: "Categories",       href: "/admin/home-categories",   icon: LayoutGrid  },
      { label: "Offers",            href: "/admin/offers",            icon: Tag         },
      { label: "Trust Badges",     href: "/admin/trust-badges",     icon: ShieldCheck },
      { label: "Campus Promo",     href: "/admin/campus-promo",     icon: MapPin      },
      { label: "Quick Link Cards", href: "/admin/homepage-cards",   icon: LayoutGrid  },
      { label: "Home Sections",    href: "/admin/home-sections",    icon: Sparkles    },
    ],
  },
  {
    label: "Buffet Page",
    icon: UtensilsCrossed,
    basePath: "/admin/buffet",
    children: [
      { label: "Buffet Hero",     href: "/admin/buffet/hero",            icon: LayoutDashboard },
      { label: "Banners",         href: "/admin/buffet/banners",         icon: ImageIcon  },
      { label: "Why Choose Us",   href: "/admin/buffet/why-choose-us",   icon: Star       },
      { label: "Buffet Timings",  href: "/admin/buffet/timings",         icon: Clock      },
      { label: "Popular Dishes",  href: "/admin/buffet/popular-dishes",  icon: Utensils   },
      { label: "About Tab",       href: "/admin/buffet/about",           icon: Info       },
      { label: "Photos Tab",      href: "/admin/buffet/photos",          icon: Images     },
      { label: "Reviews Tab",     href: "/admin/buffet/reviews",         icon: Star       },
    ],
  },
  {
    label: "Buffet Menu",
    icon: BookOpen,
    basePath: "/admin/buffet-menu",
    children: [
      { label: "Menu Sections", href: "/admin/buffet-menu/sections", icon: List     },
      { label: "Menu Items",    href: "/admin/buffet-menu/items",    icon: Utensils },
    ],
  },
  {
    label: "University Kalba",
    icon: GraduationCap,
    basePath: "/admin/kalba",
    children: [
      { label: "Branch Info",     href: "/admin/kalba/info",       icon: Info         },
      { label: "Hero Banner",     href: "/admin/kalba/banner",     icon: ImageIcon    },
      { label: "Categories",      href: "/admin/kalba/categories", icon: Grid3x3      },
      { label: "Popular Items",   href: "/admin/kalba/popular",    icon: Utensils     },
      { label: "Study & Chill",   href: "/admin/kalba/study",      icon: Armchair     },
      { label: "Daily Deals",     href: "/admin/kalba/deals",      icon: CalendarDays },
      { label: "Specials",        href: "/admin/kalba/specials",   icon: Gift         },
      { label: "Coupons",         href: "/admin/kalba/coupons",    icon: Percent      },
    ],
  },
  {
    label: "Contact Page",
    icon: Phone,
    basePath: "/admin/contact",
    children: [
      { label: "Banner & Details", href: "/admin/contact-details",   icon: Info   },
      { label: "Map Locations",    href: "/admin/contact-locations", icon: MapPin },
    ],
  },
  { label: "Header",        href: "/admin/header",   icon: PanelTop  },
  { label: "Customers",     href: "/admin/users",    icon: UsersRound },
  { label: "Table Details", href: "/admin/booking-tables", icon: Armchair },
  { label: "Student Card",  href: "/admin/student-card", icon: CreditCard },
  { label: "Spin & Win",    href: "/admin/spin-wheel", icon: Disc3   },
  { label: "Media Library", href: "/admin/media",     icon: Images   },
  { label: "Settings",      href: "/admin/settings",  icon: Settings },
  { label: "Admin Team",    href: "/admin/team",      icon: KeyRound },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isChildActive = (children: { href: string }[]) =>
    children.some((c) => pathname.startsWith(c.href));

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [access, setAccess] = useState<Access | null>(null);

  /* The sidebar shows only what this member may open. Middleware is what
     actually enforces it — hiding a link the server would refuse anyway just
     saves them the dead end. */
  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/me", { cache: "no-store" })
      .then((res) => res.json())
      .then((body) => { if (!cancelled) setAccess(body?.member ?? null); })
      .catch(() => { /* the panel still works; every link simply shows */ });
    return () => { cancelled = true; };
  }, []);

  const allowed = (href: string) => {
    if (!access) return true;            // until it loads, do not flash an empty rail
    if (access.isOwner) return true;
    if (isOwnerOnlyPath(href)) return false;
    const area = areaForPath(href);
    return area ? access.areas.includes(area.key) : false;
  };

  const nav: NavItem[] = NAV
    .map((item) => {
      if (!("children" in item)) return allowed(item.href) ? item : null;
      const children = item.children.filter((c) => allowed(c.href));
      return children.length > 0 ? { ...item, children } : null;
    })
    .filter((item): item is NavItem => item !== null);

  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    NAV.forEach((item) => {
      if ("children" in item) {
        initial[item.label] = isChildActive(item.children);
      }
    });
    return initial;
  });

  // Close the mobile drawer whenever the route changes
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  useEffect(() => {
    setOpen((prev) => {
      const next = { ...prev };
      NAV.forEach((item) => {
        if ("children" in item && isChildActive(item.children)) {
          next[item.label] = true;
        }
      });
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // The login form and the no-access notice stand on their own.
  if (pathname === "/admin" || pathname === "/admin/no-access") return <>{children}</>;

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/admin";
  }

  return (
    <div className="min-h-screen bg-[#f6f6f7] lg:flex">
      {/* Mobile top bar. `pt-safe` matters once this is an installed app: the
          viewport is set to cover the whole screen, so without it the bar draws
          underneath the clock and the menu button cannot be tapped. */}
      {/* Chrome, not content: an invoice printed from here must come out as
          the invoice alone. */}
      <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-200 pt-safe print:hidden">
        <div className="flex items-center gap-2 px-2 h-14">
        <button
          onClick={() => setSidebarOpen(true)}
          className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors shrink-0"
          aria-label="Open menu"
        >
          <Menu size={22} className="text-gray-700" />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <Image src="/logos/two-in-one.png" alt="Two In One" width={24} height={24} className="object-contain shrink-0" />
          <span className="text-sm font-semibold text-gray-900 truncate">Admin Panel</span>
        </div>
        </div>
      </div>

      {/* Mobile drawer backdrop */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar — slide-in drawer on mobile, static on desktop */}
      <aside
        className={`w-[260px] lg:w-[240px] shrink-0 bg-white border-r border-gray-200 flex flex-col h-screen fixed lg:sticky top-0 z-50 transition-transform duration-300 print:hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="px-4 py-4 border-b border-gray-200 flex items-center gap-3 pt-safe">
          <div className="w-9 h-9 rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center shrink-0">
            <Image src="/logos/two-in-one.png" alt="Two In One" width={32} height={32} className="object-contain" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900 leading-tight">Two In One</p>
            <p className="text-[11px] text-gray-400 leading-tight">Admin Panel</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {nav.map((item) => {
            if ("children" in item) {
              const groupActive = isChildActive(item.children);
              const isOpen = open[item.label] ?? false;
              return (
                <div key={item.label}>
                  <button
                    onClick={() => setOpen((p) => ({ ...p, [item.label]: !p[item.label] }))}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      groupActive
                        ? "bg-orange-50 text-orange-700"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <item.icon size={17} strokeWidth={groupActive ? 2.2 : 1.8} />
                    <span className="flex-1 text-left">{item.label}</span>
                    <ChevronDown
                      size={14}
                      className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {isOpen && (
                    <div className="mt-0.5 ml-3 pl-3 border-l border-gray-100 space-y-0.5">
                      {item.children.map(({ label, href, icon: Icon }) => {
                        const active = pathname.startsWith(href);
                        return (
                          <Link
                            key={href}
                            href={href}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              active
                                ? "bg-orange-50 text-orange-700"
                                : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                            }`}
                          >
                            <Icon size={15} strokeWidth={active ? 2.2 : 1.8} />
                            {label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-orange-50 text-orange-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <item.icon size={17} strokeWidth={active ? 2.2 : 1.8} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-gray-200 pb-safe">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut size={17} strokeWidth={1.8} />
            Log out
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 print:m-0 print:p-0">{children}</main>
    </div>
  );
}
