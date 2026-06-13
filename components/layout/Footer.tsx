import Link from "next/link";
import Image from "next/image";
import { Phone, Mail, MapPin, ArrowUpRight } from "lucide-react";
import { restaurants } from "@/data/restaurants";
import { supabaseAdmin } from "@/lib/supabase-admin";
import FadeInSection from "@/components/ui/FadeInSection";

async function getSocialLinks() {
  const { data } = await supabaseAdmin
    .from("site_settings")
    .select("facebook_url, instagram_url, twitter_url, tiktok_url, whatsapp_number, phone, email, address, city")
    .single();
  return data;
}

function FacebookIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}
function InstagramIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
    </svg>
  );
}
function XIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
function TikTokIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z" />
    </svg>
  );
}
function WhatsAppIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.122.555 4.112 1.524 5.84L.057 23.93l6.256-1.641A11.944 11.944 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.8 9.8 0 0 1-5.012-1.373l-.36-.214-3.716.975.993-3.632-.235-.373A9.787 9.787 0 0 1 2.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z" />
    </svg>
  );
}

// Food emoji bubbles for the CTA visual
const FOOD_BUBBLES = [
  { emoji: "🥘", top: "8%",  left: "52%",  size: 44 },
  { emoji: "🫓", top: "30%", left: "72%",  size: 40 },
  { emoji: "🍕", top: "55%", left: "58%",  size: 48 },
  { emoji: "🥗", top: "20%", left: "88%",  size: 38 },
  { emoji: "🍛", top: "70%", left: "80%",  size: 40 },
  { emoji: "🧆", top: "78%", left: "47%",  size: 36 },
];

export default async function Footer() {
  const social = await getSocialLinks();
  const waNumber = (social?.whatsapp_number || "971522305216").replace(/\D/g, "");

  const socialLinks = [
    social?.facebook_url  && { href: social.facebook_url,  icon: <FacebookIcon />,  label: "Facebook"  },
    social?.instagram_url && { href: social.instagram_url, icon: <InstagramIcon />, label: "Instagram" },
    social?.twitter_url   && { href: social.twitter_url,   icon: <XIcon />,         label: "Twitter"   },
    social?.tiktok_url    && { href: social.tiktok_url,    icon: <TikTokIcon />,    label: "TikTok"    },
    { href: `https://wa.me/${waNumber}`, icon: <WhatsAppIcon />, label: "WhatsApp" },
  ].filter(Boolean) as { href: string; icon: React.ReactNode; label: string }[];

  return (
    <footer id="footer" className="bg-white border-t border-gray-100">

      {/* ── CTA Banner ───────────────────────────────────────── */}
      <FadeInSection className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-2">
        <div className="relative overflow-hidden rounded-3xl bg-white border border-gray-200 px-6 sm:px-10 py-8 sm:py-10">
          {/* Left content */}
          <div className="max-w-xs sm:max-w-sm relative z-10">
            <p className="text-[11px] font-bold uppercase tracking-widest text-orange-500 mb-2">
              Order Now
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight mb-3">
              Fresh food,<br className="hidden sm:block" /> delivered fast
            </h2>
            <p className="text-gray-500 text-[13px] sm:text-sm leading-relaxed mb-5">
              Explore our menu, book a table, or request catering for your next event.
              UAE&apos;s favourite multi-cuisine destination.
            </p>
            <a
              href={`https://wa.me/${waNumber}?text=Hello! I'd like to place an order.`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-bold px-5 py-2.5 rounded-full transition-colors"
            >
              Order via WhatsApp
              <ArrowUpRight size={14} />
            </a>
          </div>

          {/* Right: food emoji bubbles */}
          <div className="absolute right-0 top-0 bottom-0 w-[45%] hidden sm:block pointer-events-none">
            {/* Concentric rings — slowly rotating */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-64 h-64 rounded-full border border-dashed border-gray-200 absolute opacity-60 orbit-ring-spin" />
              <div className="w-40 h-40 rounded-full border border-dashed border-gray-200 absolute opacity-80 orbit-ring-spin-rev" />
              {/* Center icon — soft pulse */}
              <div className="w-12 h-12 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-center justify-center z-10 text-xl center-pulse">
                🍽️
              </div>
            </div>

            {/* Floating food bubbles */}
            {FOOD_BUBBLES.map(({ emoji, top, left, size }, i) => (
              <div
                key={emoji}
                className={`absolute flex items-center justify-center rounded-full bg-white border border-gray-200 shadow-md text-lg ${
                  i % 2 === 0 ? "food-bubble" : "food-bubble-alt"
                }`}
                style={{
                  top,
                  left,
                  width: size,
                  height: size,
                  animationDelay: `${i * 0.45}s`,
                }}
              >
                {emoji}
              </div>
            ))}
          </div>
        </div>
      </FadeInSection>

      {/* ── Footer Body ──────────────────────────────────────── */}
      <FadeInSection className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">

          {/* Brand */}
          <div className="col-span-2 sm:col-span-2 lg:col-span-1">
            <div className="mb-3">
              <Image
                src="/logos/two-in-one.png"
                alt="Two In One"
                width={100}
                height={40}
                className="object-contain"
              />
            </div>
            <p className="text-gray-500 text-[13px] leading-relaxed mb-5">
              Your one-stop platform for the best food delivery across UAE.
              4 restaurants, one destination.
            </p>
            <div className="flex gap-2 flex-wrap">
              {socialLinks.map(({ href, icon, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-500 transition-colors"
                >
                  {icon}
                </a>
              ))}
            </div>
          </div>

          {/* Restaurants */}
          <div>
            <h4 className="text-gray-900 font-bold text-sm mb-4">Restaurants</h4>
            <ul className="space-y-2.5">
              {restaurants.map((r) => (
                <li key={r.id}>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[13px] text-gray-500 hover:text-orange-500 transition-colors flex items-center gap-1.5"
                  >
                    {r.name}
                    <ArrowUpRight size={11} className="opacity-0 group-hover:opacity-100" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-gray-900 font-bold text-sm mb-4">Quick Links</h4>
            <ul className="space-y-2.5">
              {[
                { label: "Home",          href: "/"                          },
                { label: "Book a Table",  href: "/book-table"                },
                { label: "Catering",      href: "/catering"                  },
                { label: "University Kalba", href: "/restaurant/university-kalba" },
                { label: "Buffet Menu",   href: "/restaurant/buffet"         },
              ].map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-[13px] text-gray-500 hover:text-orange-500 transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-gray-900 font-bold text-sm mb-4">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5 text-[13px] text-gray-500">
                <MapPin size={13} className="text-orange-400 mt-0.5 shrink-0" />
                {social?.address
                  ? `${social.address}${social.city ? `, ${social.city}` : ""}`
                  : "Dubai, United Arab Emirates"}
              </li>
              <li>
                <a
                  href={`tel:${social?.phone || "+971522305216"}`}
                  className="flex items-center gap-2.5 text-[13px] text-gray-500 hover:text-orange-500 transition-colors"
                >
                  <Phone size={13} className="text-orange-400 shrink-0" />
                  {social?.phone || "+971 52 230 5216"}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${social?.email || "hello@twoinoneae.com"}`}
                  className="flex items-center gap-2.5 text-[13px] text-gray-500 hover:text-orange-500 transition-colors"
                >
                  <Mail size={13} className="text-orange-400 shrink-0" />
                  {social?.email || "hello@twoinoneae.com"}
                </a>
              </li>
            </ul>

            {/* Newsletter mini */}
            <div className="mt-5">
              <p className="text-[12px] text-gray-400 mb-2">Get updates &amp; offers</p>
              <a
                href={`mailto:${social?.email || "hello@twoinoneae.com"}?subject=Subscribe me to updates`}
                className="flex items-center justify-between gap-2 border border-gray-200 rounded-full px-3 py-2 hover:border-orange-300 transition-colors group"
              >
                <span className="text-[12px] text-gray-400">Enter your email…</span>
                <span className="w-7 h-7 rounded-full bg-gray-900 group-hover:bg-orange-500 flex items-center justify-center transition-colors">
                  <ArrowUpRight size={12} className="text-white" />
                </span>
              </a>
            </div>
          </div>

        </div>
      </FadeInSection>

      {/* ── Bottom bar ───────────────────────────────────────── */}
      <div className="border-t border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] text-gray-400">
          <p>© {new Date().getFullYear()} Two In One UAE · All rights reserved</p>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-gray-600 transition-colors">Privacy</Link>
            <Link href="/" className="hover:text-gray-600 transition-colors">Terms</Link>
            <div className="flex items-center gap-2 ml-2">
              {socialLinks.slice(0, 4).map(({ href, icon, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="text-gray-400 hover:text-gray-700 transition-colors"
                >
                  {icon}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

    </footer>
  );
}
