import Image from "next/image";
import Link from "next/link";

export interface BannerSlide {
  id: string;
  tag: string;
  headline_orange: string;
  headline_black: string;
  subtitle: string;
  cta_text: string;
  cta_href: string;
  bg_color: string;
  accent_color: string;
  food_image_url: string;
  food_alt: string;
  sort_order: number;
}

export default function HeroBanner({ slides }: { slides: BannerSlide[] }) {
  if (!slides.length) return null;

  return (
    <section className="pt-1 pb-2">
      <div className="max-w-7xl mx-auto">
        {/* Horizontally scrollable, fully clickable banner images */}
        <div
          className="flex gap-3 overflow-x-auto scrollbar-none momentum-x px-4 pb-1"
          style={{ scrollPaddingLeft: "1rem", scrollPaddingRight: "1rem" }}
        >
          {slides.map((s, i) => {
            const href = s.cta_href || "#";
            const external = /^https?:\/\//.test(href);

            const card = (
              <div
                className="relative w-full h-full overflow-hidden rounded-2xl"
                style={{ background: s.bg_color || "#f3f4f6", boxShadow: "0 4px 18px rgba(0,0,0,0.10)" }}
              >
                {s.food_image_url && (
                  <Image
                    src={s.food_image_url}
                    alt={s.food_alt || s.tag || "Offer"}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 64vw, 360px"
                    priority={i === 0}
                  />
                )}

                {/* Order button — overlaid like the reference design */}
                <span className="absolute bottom-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 bg-black/85 text-white text-[11px] sm:text-xs font-bold px-4 py-2 rounded-full whitespace-nowrap backdrop-blur-sm">
                  {s.cta_text || "Order Now"}
                </span>
              </div>
            );

            const cls =
              "snap-item shrink-0 w-[44%] sm:w-[300px] aspect-[6/7] sm:aspect-[16/10] tap-shrink block";

            return external ? (
              <a key={s.id} href={href} className={cls} aria-label={s.cta_text || s.tag || "Offer"}>
                {card}
              </a>
            ) : (
              <Link key={s.id} href={href} className={cls} aria-label={s.cta_text || s.tag || "Offer"}>
                {card}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
