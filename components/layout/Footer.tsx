import Link from "next/link";
import Image from "next/image";
import { Phone, Mail, MapPin, MessageCircle } from "lucide-react";
import { restaurants } from "@/data/restaurants";
import { supabaseAdmin } from "@/lib/supabase-admin";

async function getSocialLinks() {
  const { data } = await supabaseAdmin
    .from("site_settings")
    .select("facebook_url, instagram_url, twitter_url, tiktok_url, whatsapp_number, phone, email, address, city")
    .single();
  return data;
}

function FacebookIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}
function InstagramIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
    </svg>
  );
}
function XIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
function TikTokIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z" />
    </svg>
  );
}

export default async function Footer() {
  const social = await getSocialLinks();

  const socialLinks = [
    social?.facebook_url && { href: social.facebook_url, icon: <FacebookIcon />, label: "Facebook" },
    social?.instagram_url && { href: social.instagram_url, icon: <InstagramIcon />, label: "Instagram" },
    social?.twitter_url && { href: social.twitter_url, icon: <XIcon />, label: "Twitter" },
    social?.tiktok_url && { href: social.tiktok_url, icon: <TikTokIcon />, label: "TikTok" },
    { href: `https://wa.me/${(social?.whatsapp_number || "971522305216").replace(/\D/g, "")}`, icon: <MessageCircle size={14} className="text-white" />, label: "WhatsApp" },
  ].filter(Boolean) as { href: string; icon: React.ReactNode; label: string }[];

  return (
    <footer id="footer" className="bg-gray-900 text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* Brand */}
        <div className="lg:col-span-1">
          <div className="mb-3" style={{ mixBlendMode: "screen" }}>
            <Image
              src="/logos/two-in-one.png"
              alt="Two In One"
              width={110}
              height={110}
              className="object-contain"
              style={{ filter: "invert(1)" }}
            />
          </div>
          <p className="text-sm leading-relaxed mt-1 mb-4">
            Your one-stop platform for the best food delivery across UAE.
          </p>
          <div className="flex gap-2.5 flex-wrap">
            {socialLinks.map(({ href, icon, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="bg-gray-800 hover:bg-orange-600 p-2.5 rounded-full transition-colors"
              >
                {icon}
              </a>
            ))}
          </div>
        </div>

        {/* Restaurants */}
        <div>
          <h4 className="text-white font-semibold mb-3 text-xs uppercase tracking-wider">Our Restaurants</h4>
          <ul className="space-y-2">
            {restaurants.map((r) => (
              <li key={r.id}>
                <a href={r.url} target="_blank" rel="noopener noreferrer"
                  className="text-sm hover:text-orange-400 transition-colors flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 inline-block" />
                  {r.name}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="text-white font-semibold mb-3 text-xs uppercase tracking-wider">Quick Links</h4>
          <ul className="space-y-2">
            {[
              { label: "Home", href: "/" },
              { label: "Offers", href: "#offers" },
              { label: "Catering", href: "/catering" },
              { label: "About Us", href: "#" },
            ].map((l) => (
              <li key={l.label}>
                <Link href={l.href} className="text-sm hover:text-orange-400 transition-colors">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="text-white font-semibold mb-3 text-xs uppercase tracking-wider">Contact</h4>
          <ul className="space-y-2.5">
            <li className="flex items-start gap-2 text-sm">
              <MapPin size={13} className="text-orange-400 mt-0.5 shrink-0" />
              {social?.address ? `${social.address}${social.city ? `, ${social.city}` : ""}` : "Dubai, United Arab Emirates"}
            </li>
            <li>
              <a href={`tel:${social?.phone || "+971522305216"}`} className="flex items-center gap-2 text-sm hover:text-orange-400 transition-colors">
                <Phone size={13} className="text-orange-400 shrink-0" />
                {social?.phone || "+971 52 230 5216"}
              </a>
            </li>
            <li>
              <a href={`mailto:${social?.email || "hello@twoinoneae.com"}`} className="flex items-center gap-2 text-sm hover:text-orange-400 transition-colors">
                <Mail size={13} className="text-orange-400 shrink-0" />
                {social?.email || "hello@twoinoneae.com"}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <p>© {new Date().getFullYear()} Two In One UAE. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
