"use client";
import { useState } from "react";
import Link from "next/link";
import { Menu, X, Phone, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Restaurants", href: "#restaurants" },
  { label: "Offers", href: "#offers" },
  { label: "Catering", href: "/catering" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100" style={{ boxShadow: "0 1px 12px rgba(0,0,0,0.06)" }}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Hamburger */}
          <button
            onClick={() => setOpen(!open)}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Menu"
          >
            <Menu size={22} className="text-gray-700" />
          </button>

          {/* Brand — centered, links to home */}
          <Link href="/" className="flex flex-col items-center">
            <div className="flex items-center gap-2">
              <span
                className="text-3xl text-green-700 leading-none"
                style={{ fontFamily: "var(--font-dancing)" }}
              >
                Two In One
              </span>
              <span className="bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-none">
                UAE
              </span>
            </div>
            <p className="text-[10px] text-gray-400 tracking-wide mt-0.5 hidden sm:block">
              4 Restaurants. One Destination.
            </p>
          </Link>

          {/* Phone CTA */}
          <a
            href="tel:+971522305216"
            className="w-10 h-10 flex items-center justify-center bg-green-50 hover:bg-green-100 rounded-full text-green-600 transition-colors border border-green-100"
            aria-label="Call us"
          >
            <Phone size={17} />
          </a>
        </div>
      </nav>

      {/* Slide-in drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40 sm:hidden"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed top-0 left-0 h-full w-72 bg-white z-50 shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <span
                  className="text-2xl text-green-700"
                  style={{ fontFamily: "var(--font-dancing)" }}
                >
                  Two In One UAE
                </span>
                <button onClick={() => setOpen(false)} className="p-1 rounded-full hover:bg-gray-100">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 py-4 overflow-y-auto">
                {NAV_LINKS.map((l) => (
                  <Link
                    key={l.label}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between px-5 py-3.5 text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors text-sm font-medium"
                  >
                    {l.label}
                    <ChevronRight size={16} className="text-gray-300" />
                  </Link>
                ))}
              </div>
              <div className="p-5 border-t border-gray-100">
                <Link
                  href="/catering"
                  onClick={() => setOpen(false)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-bold py-3 rounded-2xl text-center block transition-colors"
                >
                  Book Catering
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
