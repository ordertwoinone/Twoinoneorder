"use client";

import { Heart } from "lucide-react";
import { useFavorites, FavoriteItem } from "@/lib/favorites/FavoritesContext";

interface Props extends FavoriteItem {
  size?: number;
  className?: string;
}

export default function FavoriteButton({
  size = 16,
  className = "",
  ...item
}: Props) {
  const { isFavorite, toggle } = useFavorites();
  const active = isFavorite(item.itemKey);

  return (
    <button
      type="button"
      aria-label={active ? "Remove from favourites" : "Add to favourites"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(item);
      }}
      className={`flex items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-sm border border-gray-100 transition-all hover:scale-110 active:scale-95 ${className}`}
    >
      <Heart
        size={size}
        className={active ? "fill-red-500 stroke-red-500" : "stroke-gray-400"}
        strokeWidth={2}
      />
    </button>
  );
}
