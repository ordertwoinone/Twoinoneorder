"use client";
import { Mail, Share2 } from "lucide-react";

export default function TopBar() {
  return (
    <div className="bg-orange-600 text-orange-100 text-xs py-2 px-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <a
          href="mailto:hello@twoinoneae.com"
          className="flex items-center gap-1.5 hover:text-white transition-colors"
        >
          <Mail size={11} />
          hello@twoinoneae.com
        </a>
        <div className="flex items-center gap-3">
          <span className="opacity-60">Follow us</span>
          <a href="#" aria-label="Social" className="hover:text-white transition-colors">
            <Share2 size={12} />
          </a>
        </div>
      </div>
    </div>
  );
}
