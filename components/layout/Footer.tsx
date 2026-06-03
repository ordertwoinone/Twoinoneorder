"use client";
import Link from "next/link";
import { Phone, Mail, MapPin, Share2, MessageCircle } from "lucide-react";
import { restaurants } from "@/data/restaurants";

export default function Footer() {
  return (
    <footer id="footer" className="bg-gray-900 text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* Brand */}
        <div className="lg:col-span-1">
          <p
            className="text-3xl text-green-400 mb-1"
            style={{ fontFamily: "var(--font-dancing)" }}
          >
            Two In One
          </p>
          <span className="bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">UAE</span>
          <p className="text-sm leading-relaxed mt-3 mb-4">
            Your one-stop platform for the best food delivery across UAE.
          </p>
          <div className="flex gap-2.5">
            <a href="#" className="bg-gray-800 hover:bg-green-600 p-2.5 rounded-full transition-colors">
              <Share2 size={14} className="text-white" />
            </a>
            <a href="https://wa.me/971522305216" className="bg-gray-800 hover:bg-green-600 p-2.5 rounded-full transition-colors">
              <MessageCircle size={14} className="text-white" />
            </a>
          </div>
        </div>

        {/* Restaurants */}
        <div>
          <h4 className="text-white font-semibold mb-3 text-xs uppercase tracking-wider">Our Restaurants</h4>
          <ul className="space-y-2">
            {restaurants.map((r) => (
              <li key={r.id}>
                <a href={r.url} target="_blank" rel="noopener noreferrer"
                  className="text-sm hover:text-green-400 transition-colors flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
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
                <Link href={l.href} className="text-sm hover:text-green-400 transition-colors">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="text-white font-semibold mb-3 text-xs uppercase tracking-wider">Contact</h4>
          <ul className="space-y-2.5">
            <li className="flex items-start gap-2 text-sm">
              <MapPin size={13} className="text-green-400 mt-0.5 shrink-0" />
              Dubai, United Arab Emirates
            </li>
            <li>
              <a href="tel:+971522305216" className="flex items-center gap-2 text-sm hover:text-green-400 transition-colors">
                <Phone size={13} className="text-green-400 shrink-0" />
                +971 52 230 5216
              </a>
            </li>
            <li>
              <a href="mailto:hello@twoinoneae.com" className="flex items-center gap-2 text-sm hover:text-green-400 transition-colors">
                <Mail size={13} className="text-green-400 shrink-0" />
                hello@twoinoneae.com
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
