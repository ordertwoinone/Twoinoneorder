import Image from "next/image";
import { Star, ArrowRight } from "lucide-react";

const BUFFETS = [
  {
    id: "b1",
    name: "Two in One Buffet",
    cuisine: "Arabic, Indian, Continental",
    price: 39,
    rating: 4.6,
    reviews: 120,
    badge: "NEW",
    image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80",
    href: "/catering",
  },
  {
    id: "b2",
    name: "Weekend Family Buffet",
    cuisine: "Multi Cuisine",
    price: 49,
    rating: 4.7,
    reviews: 98,
    badge: "NEW",
    image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80",
    href: "/catering",
  },
  {
    id: "b3",
    name: "Business Lunch Buffet",
    cuisine: "Arabic, International",
    price: 35,
    rating: 4.5,
    reviews: 76,
    badge: "NEW",
    image: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&q=80",
    href: "/catering",
  },
];

export default function BuffetHighlights() {
  return (
    <section className="py-4 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-extrabold text-gray-900">Buffet Highlights</h2>
          <a
            href="/catering"
            className="flex items-center gap-1 text-xs font-bold"
            style={{ color: "#ea580c" }}
          >
            View All <ArrowRight size={13} />
          </a>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {BUFFETS.map((b) => (
            <a
              key={b.id}
              href={b.href}
              className="bg-white rounded-2xl overflow-hidden border border-gray-100 block group transition-shadow hover:shadow-md"
              style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}
            >
              {/* Image */}
              <div className="relative" style={{ height: "180px" }}>
                <Image
                  src={b.image}
                  alt={b.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 50vw, 33vw"
                />
                {/* Badge */}
                <span
                  className="absolute top-3 left-3 text-[11px] font-bold px-3 py-1 rounded-full text-white z-10"
                  style={{ background: "#7c3aed" }}
                >
                  {b.badge}
                </span>
              </div>

              {/* Info */}
              <div className="px-4 pt-3 pb-4">
                <h3 className="text-gray-900 font-extrabold text-[15px] leading-tight mb-1">
                  {b.name}
                </h3>
                <p className="text-gray-400 text-[12px] mb-2">{b.cuisine}</p>

                {/* Price */}
                <p className="font-extrabold text-lg mb-3" style={{ color: "#ea580c" }}>
                  AED {b.price}
                </p>

                {/* Rating + Book Now */}
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-[12px] font-semibold text-gray-700">
                    <Star size={12} className="fill-green-500 stroke-green-500" />
                    {b.rating}{" "}
                    <span className="text-gray-400 font-normal">({b.reviews}+)</span>
                  </span>

                  <button
                    className="text-[12px] font-bold px-4 py-1.5 rounded-xl border-2 transition-colors hover:bg-purple-50"
                    style={{ color: "#7c3aed", borderColor: "#7c3aed" }}
                  >
                    Book Now
                  </button>
                </div>
              </div>
            </a>
          ))}
        </div>

      </div>
    </section>
  );
}
