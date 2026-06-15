"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Tag, CalendarCheck, Heart, User } from "lucide-react";

const ITEMS = [
  { icon: Home, label: "Home", href: "/" },
  { icon: Tag, label: "Offers", href: "#offers" },
  { icon: CalendarCheck, label: "Book Table", href: "/book-table", primary: true },
  { icon: Heart, label: "Favourites", href: "#" },
  { icon: User, label: "Account", href: "#" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] sm:hidden">
      <div className="flex items-end justify-around h-16 max-w-sm mx-auto px-2">
        {ITEMS.map((item) => {
          const active = pathname === item.href;

          // Prominent orange rounded CTA — Book a Table
          if (item.primary) {
            return (
              <Link
                key={item.label}
                href={item.href}
                className="flex flex-col items-center gap-1 -mt-5"
              >
                <span
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white border-4 border-white"
                  style={{ background: "#ea580c", boxShadow: "0 6px 16px rgba(234,88,12,0.45)" }}
                >
                  <item.icon size={22} strokeWidth={2.2} />
                </span>
                <span className="text-[10px] font-bold text-orange-600">{item.label}</span>
              </Link>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 pb-2 rounded-xl transition-colors ${
                active ? "text-orange-600" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <item.icon
                size={22}
                strokeWidth={active ? 2.5 : 1.8}
                className={active ? "text-orange-600" : ""}
              />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
