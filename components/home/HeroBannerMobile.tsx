import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const GREEN = "#1d3d2f";
const GOLD = "#f5b32c";

// Mobile hero — full-bleed green banner matching the "Four Restaurants /
// One Easy Order" design. Text left, food composition bleeding on the right.
// The search pill (in page.tsx) overlaps the bottom edge of this banner.
export default function HeroBannerMobile() {
  return (
    <section className="sm:hidden">
      <div
        className="relative overflow-hidden rounded-t-[28px]"
        style={{ background: GREEN, minHeight: "210px" }}
      >
        {/* Food image — right side, bleeding off the edge */}
        <div className="absolute right-[-8px] top-0 bottom-0 w-[48%] pointer-events-none">
          <Image
            src="/hero/slide-1.png"
            alt="Shawarma, karak tea, sandwiches, samosas and more"
            fill
            className="object-contain object-center"
            sizes="50vw"
            priority
          />
        </div>

        {/* Text */}
        <div className="relative z-10 pl-5 pr-[42%] pt-5 pb-10">
          <h2
            className="font-extrabold text-white leading-[1.05] tracking-tight"
            style={{ fontSize: "clamp(21px, 6.2vw, 27px)" }}
          >
            Four Restaurants.
            <br />
            <span style={{ color: GOLD }}>One Easy Order.</span>
          </h2>

          <p className="text-white/80 text-[11px] leading-snug mt-2.5">
            Arabic, Indian, Chinese, Turkish, Shawarma, Pastries, Karak &amp; more
            &ndash; delivered to your door.
          </p>

          <Link
            href="/#restaurants"
            className="inline-flex items-center gap-1.5 font-bold text-[13px] mt-3.5 px-4 py-2 rounded-full active:scale-95 transition-transform"
            style={{ background: GOLD, color: GREEN }}
          >
            Order Now
            <ArrowRight size={15} strokeWidth={2.6} />
          </Link>
        </div>
      </div>
    </section>
  );
}
