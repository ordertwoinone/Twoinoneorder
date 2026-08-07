"use client";

import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useLocalized } from "@/lib/i18n/localized";

export interface CategoryTileData {
  name: string;
  /** Arabic name from admin → Cuisine Categories. Blank falls back to English. */
  nameAr?: string | null;
  imageUrl: string;
  href: string;
}

/**
 * One cuisine tile. Client-side only because the label doubles as the image's
 * alt text, and both follow the language.
 *
 * Category names are admin-managed, so they go through tMaybe: the ten built-in
 * cuisines are translated, and anything else added in the admin panel shows
 * exactly as typed.
 */
export default function CategoryTile({
  cat,
  itemClass,
  style,
}: {
  cat: CategoryTileData;
  itemClass: string;
  style?: CSSProperties;
}) {
  const { tMaybe } = useTranslation();
  const localized = useLocalized();
  // An Arabic name typed in admin wins; otherwise fall back to the dictionary
  // translation of the ten built-in cuisines, then to the English text.
  const label = localized(tMaybe(`home.categories.${cat.name}`, cat.name), cat.nameAr);
  const isExternal = cat.href?.startsWith("http");

  const inner = (
    <>
      <div
        className={`relative w-full aspect-square rounded-2xl overflow-hidden shadow-sm ring-2 ring-transparent transition-all duration-200 ${
          cat.href ? "group-hover:ring-orange-400 group-hover:shadow-md group-hover:scale-[1.05] cursor-pointer" : ""
        }`}
      >
        <Image src={cat.imageUrl} alt={label} fill className="object-cover" sizes="(max-width: 768px) 20vw, 10vw" />
        <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/40 to-transparent" />
      </div>
      <p
        className={`text-[10px] sm:text-[11px] font-bold text-center leading-tight transition-colors ${
          cat.href ? "text-gray-700 group-hover:text-orange-600" : "text-gray-500"
        }`}
      >
        {label}
      </p>
    </>
  );

  if (!cat.href) return <div className={`${itemClass} cursor-default`} style={style}>{inner}</div>;
  return isExternal ? (
    <a href={cat.href} className={itemClass} style={style}>{inner}</a>
  ) : (
    <Link href={cat.href} className={itemClass} style={style}>{inner}</Link>
  );
}
