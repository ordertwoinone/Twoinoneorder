"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, Tag, CalendarCheck, Phone, User } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { TranslationKey } from "@/lib/i18n/types";

const ITEMS: { icon: typeof Home; labelKey: TranslationKey; href: string }[] = [
  { icon: Home, labelKey: "nav.home", href: "/" },
  { icon: Tag, labelKey: "nav.offers", href: "/offers" },
  { icon: CalendarCheck, labelKey: "nav.bookTable", href: "/book-table" },
  { icon: Phone, labelKey: "nav.contact", href: "/contact" },
  { icon: User, labelKey: "nav.account", href: "/account" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { t } = useTranslation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-gray-100 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-center h-16 max-w-md mx-auto px-1">
        {ITEMS.map((item) => {
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex-1 flex flex-col items-center gap-0.5 py-1 tap-shrink transition-colors ${
                active ? "text-orange-600" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {/* Animated active pill behind the icon */}
              {active && (
                <motion.span
                  layoutId="bottomnav-active"
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  className="absolute top-0.5 w-10 h-7 rounded-full bg-orange-50"
                />
              )}
              <item.icon
                size={22}
                strokeWidth={active ? 2.5 : 1.8}
                className={`relative z-10 ${active ? "text-orange-600" : ""}`}
              />
              <span className="relative z-10 text-[10px] font-medium whitespace-nowrap">
                {t(item.labelKey)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
