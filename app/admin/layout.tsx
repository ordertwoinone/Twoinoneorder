"use client";
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Store, LogOut, LayoutDashboard, Image as ImageIcon, Tag, Settings, FolderImage } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Restaurants", href: "/admin/restaurants", icon: Store },
  { label: "Hero Banners", href: "/admin/banners", icon: ImageIcon },
  { label: "Offers", href: "/admin/offers", icon: Tag },
  { label: "Media Library", href: "/admin/media", icon: FolderImage },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

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
          {NAV.map(({ label, href, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-orange-50 text-orange-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <Icon size={17} strokeWidth={active ? 2.2 : 1.8} />
                {label}
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
