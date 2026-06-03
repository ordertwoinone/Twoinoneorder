"use client";
import { useState, useMemo, useCallback } from "react";
import Fuse from "fuse.js";
import { menuItems, MenuItem } from "@/data/menuItems";

export function useSearch() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const fuse = useMemo(
    () =>
      new Fuse(menuItems, {
        keys: ["name", "category", "tags", "restaurantName"],
        threshold: 0.35,
        includeScore: true,
        minMatchCharLength: 2,
      }),
    []
  );

  const results: MenuItem[] = useMemo(() => {
    if (query.trim().length < 2) return [];
    return fuse.search(query).map((r) => r.item).slice(0, 8);
  }, [query, fuse]);

  const handleChange = useCallback((val: string) => {
    setQuery(val);
    setIsOpen(val.trim().length >= 2);
  }, []);

  const clear = useCallback(() => {
    setQuery("");
    setIsOpen(false);
  }, []);

  return { query, results, isOpen, setIsOpen, handleChange, clear };
}
