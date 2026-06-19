import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, Phone, Mail, MapPin, Clock, MessageCircle, ArrowUpRight, Star } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BottomNav from "@/components/layout/BottomNav";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const metadata: Metadata = {
  title: "Contact Us — Two In One UAE",
  description:
    "Get in touch with Two In One UAE. Call, WhatsApp or email us for orders, catering enquiries, table bookings and more.",
};

async function getSettings() {
  const { data } = await supabaseAdmin
    .from("site_settings")
    .select("facebook_url, instagram_url, twitter_url, tiktok_url, whatsapp_number, phone, email, address, city")
    .single();
  return data;
}

export default async function ContactPage() {
  const settings = await getSettings();

  const phone = settings?.phone || "+971 52 230 5216";
  const email = settings?.email || "hello@twoinoneae.com";
  const waNumber = (settings?.whatsapp_number || "971522305216").replace(/\D/g, "");
  const address = settings?.address
    ? `${settings.address}${settings.city ? `, ${settings.city}` : ""}`
    : "Dubai, United Arab Emirates";

  const methods = [
    {
      icon: Phone,
      label: "Call Us",
      value: phone,
      href: `tel:${phone.replace(/\s/g, "")}`,
      accent: "#ea580c",
    },
    {
      icon: MessageCircle,
      label: "WhatsApp",
      value: "Chat with us",
      href: `https://wa.me/${waNumber}`,
      external: true,
      accent: "#16a34a",
    },
    {
      icon: Mail,
      label: "Email",
      value: email,
      href: `mailto:${email}`,
      accent: "#2563eb",
    },
  ];

  return (
    <>
      <Navbar />

      <main className="bg-white pb-20 sm:pb-8">
        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="px-4 pt-4">
          <div className="max-w-5xl mx-auto">
            <div
              className="relative overflow-hidden rounded-3xl px-6 sm:px-10 py-9 sm:py-12"
              style={{ background: "linear-gradient(120deg,#fff7ed 0%,#ffedd5 55%,#fed7aa 100%)" }}
            >
              <div className="relative z-10 max-w-xl">
                <span
                  className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full mb-4"
                  style={{ color: "#ea580c", border: "1.5px solid #ea580c", background: "#ea580c10" }}
                >
                  <Star size={12} className="fill-orange-500 stroke-orange-500" />
                  Get In Touch
                </span>

                <h1 className="text-2xl sm:text-4xl font-black leading-tight text-gray-900 mb-3">
                  We&apos;d Love to{" "}
                  <span style={{ color: "#ea580c" }}>Hear From You</span>
                </h1>
                <p className="text-gray-600 text-[13px] sm:text-[15px] leading-relaxed max-w-md">
                  Questions about an order, catering, or a table booking? Our team
                  is here to help — reach us any way you like and we&apos;ll reply fast.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Contact methods ──────────────────────────────────── */}
        <section className="px-4 py-8">
          <div className="max-w-5xl mx-auto">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-orange-600 mb-5 transition-colors"
            >
              <ChevronLeft size={16} />
              Back to Home
            </Link>

            <div className="grid sm:grid-cols-3 gap-3 sm:gap-4">
              {methods.map(({ icon: Icon, label, value, href, external, accent }) => (
                <a
                  key={label}
                  href={href}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noopener noreferrer" : undefined}
                  className="group bg-white rounded-3xl border border-gray-100 shadow-sm p-5 flex items-center gap-4 hover:shadow-md hover:border-orange-200 transition-all"
                >
                  <span
                    className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ background: `${accent}15`, color: accent }}
                  >
                    <Icon size={22} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">{label}</p>
                    <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-orange-600 transition-colors">
                      {value}
                    </p>
                  </div>
                  <ArrowUpRight size={16} className="ml-auto text-gray-300 group-hover:text-orange-500 transition-colors shrink-0" />
                </a>
              ))}
            </div>

            {/* ── Location & hours ───────────────────────────────── */}
            <div className="grid sm:grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
                <span className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
                  <MapPin size={22} />
                </span>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Location</p>
                  <p className="text-sm font-semibold text-gray-900">{address}</p>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
                <span className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
                  <Clock size={22} />
                </span>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Opening Hours</p>
                  <p className="text-sm font-semibold text-gray-900">Every day · 9:00 AM – 11:00 PM</p>
                </div>
              </div>
            </div>

            {/* ── WhatsApp CTA ───────────────────────────────────── */}
            <a
              href={`https://wa.me/${waNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 sm:mt-4 flex items-center justify-center gap-2.5 bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-2xl transition-all hover:scale-[1.01] active:scale-[0.99] text-sm"
            >
              <MessageCircle size={18} />
              Message us on WhatsApp
            </a>
          </div>
        </section>

        <Footer />
      </main>

      <BottomNav />
    </>
  );
}
