"use client";
import Image from "next/image";
import { GraduationCap, LayoutGrid } from "lucide-react";

const CATEGORIES = [
  {
    id: "popular",
    label: "Popular",
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=200&q=80",
    href: "#restaurants",
  },
  {
    id: "pizza",
    label: "Pizza",
    image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&q=80",
    href: "#restaurants",
  },
  {
    id: "burgers",
    label: "Burgers",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&q=80",
    href: "#restaurants",
  },
  {
    id: "shawarma",
    label: "Shawarma",
    image: "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=200&q=80",
    href: "#restaurants",
  },
  {
    id: "falafel",
    label: "Falafel",
    image: "https://images.unsplash.com/photo-1593001872095-7d5b3868dd20?w=200&q=80",
    href: "#restaurants",
  },
  {
    id: "buffet",
    label: "Buffet",
    image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&q=80",
    href: "#restaurants",
  },
  {
    id: "university-kalba",
    label: "Two in One\nUniversity Kalba",
    image: null,
    icon: "graduation",
    badge: "NEW",
    href: "#restaurants",
  },
  {
    id: "all",
    label: "All",
    image: null,
    icon: "grid",
    href: "#restaurants",
  },
];

export default function CategoryRow() {
  return (
    <section className="px-4 py-3">
      <div className="max-w-7xl mx-auto">
        <div className="flex gap-2 overflow-x-auto scrollbar-none sm:justify-between">
          {CATEGORIES.map((cat) => (
            <a
              key={cat.id}
              href={cat.href}
              className="flex flex-col items-center gap-2 flex-shrink-0 group"
              style={{ minWidth: "72px" }}
            >
              {/* Tile */}
              <div className="relative">
                {"badge" in cat && cat.badge && (
                  <span
                    className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 text-[9px] font-bold px-2 py-0.5 rounded-full text-white whitespace-nowrap"
                    style={{ background: "#7c3aed" }}
                  >
                    {cat.badge}
                  </span>
                )}
                <div
                  className="w-[72px] h-[72px] rounded-2xl bg-white border border-gray-100 flex items-center justify-center overflow-hidden transition-shadow group-hover:shadow-md"
                  style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
                >
                  {cat.image ? (
                    <div className="relative w-14 h-14 rounded-full overflow-hidden">
                      <Image
                        src={cat.image}
                        alt={cat.label}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    </div>
                  ) : cat.icon === "graduation" ? (
                    <GraduationCap size={36} className="text-gray-800" strokeWidth={1.5} />
                  ) : (
                    <LayoutGrid size={30} className="text-gray-700" strokeWidth={1.5} />
                  )}
                </div>
              </div>

              {/* Label */}
              <span className="text-[10px] sm:text-[11px] font-semibold text-gray-800 text-center leading-tight whitespace-pre-line">
                {cat.label}
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
