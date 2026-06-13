"use client";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Store, LogOut, LayoutDashboard, Image as ImageIcon, Tag, Settings,
  Images, Home, ChevronDown, Clock, Utensils, Star, UtensilsCrossed,
  BookOpen, List, CalendarCheck, Sparkles, GraduationCap, Info, Grid3x3,
  Armchair, CalendarDays, Gift, Percent, MapPin, LayoutGrid,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { LucideIcon } from "lucide-react";

type NavChild = { label: string; href: string; icon: LucideIcon };
type NavItem =
  | { label: string; href: string; icon: LucideIcon }
  | { label: string; icon: LucideIcon; basePath: string; children: NavChild[] };

const NAV: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  {
    label: "Homepage",
    icon: Home,
    basePath: "/admin/homepage-section",
    children: [
      { label: "Restaurants",       href: "/admin/restaurants",       icon: Store       },
      { label: "Hero Banners",      href: "/admin/banners",           icon: ImageIcon   },
      { label: "Categories",       href: "/admin/home-categories",   icon: LayoutGrid  },
      { label: "Offers",            href: "/admin/offers",            icon: Tag         },
      { label: "Buffet Highlights", href: "/admin/buffet-highlights", icon: Sparkles    },
      { label: "Campus Promo",     href: "/admin/campus-promo",     icon: MapPin      },
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
  { label: "Bookings",       href: "/admin/bookings", icon: CalendarCheck },
  { label: "Media Library", href: "/admin/media",     icon: Images   },
  { label: "Settings",      href: "/admin/settings",  icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isChildActive = (children: { href: string }[]) =>
    children.some((c) => pathname.startsWith(c.href));

  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    NAV.forEach((item) => {
      if ("children" in item) {
        initial[item.label] = isChildActive(item.children);
      }
    });
    return initial;
  });

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

  if (pathname === "/admin") return <>{children}</>;

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/admin";
  }

  return (
    <div className="min-h-screen bg-[#f6f6f7] flex">
      {/* Sidebar */}
      <aside className="w-[240px] shrink-0 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0">
        <div className="px-4 py-4 border-b border-gray-200 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center shrink-0">
            <Image src="/logos/two-in-one.png" alt="Two In One" width={32} height={32} className="object-contain" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 leading-tight">Two In One</p>
            <p className="text-[11px] text-gray-400 leading-tight">Admin Panel</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map((item) => {
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

        <div className="px-3 py-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut size={17} strokeWidth={1.8} />
            Log out
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
