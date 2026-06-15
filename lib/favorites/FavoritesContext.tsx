"use client";

import {
  createContext, useContext, useEffect, useState, useCallback, ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export interface FavoriteItem {
  itemKey: string;     // unique id for the item (slug / href)
  name: string;
  imageUrl?: string;
  href?: string;
  subtitle?: string;
}

interface FavoritesCtx {
  ready: boolean;
  loggedIn: boolean;
  keys: Set<string>;
  isFavorite: (key: string) => boolean;
  toggle: (item: FavoriteItem) => Promise<void>;
}

const Ctx = createContext<FavoritesCtx | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const router = useRouter();
  const [keys, setKeys] = useState<Set<string>>(new Set());
  const [loggedIn, setLoggedIn] = useState(false);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoggedIn(false);
      setKeys(new Set());
      setReady(true);
      return;
    }
    setLoggedIn(true);
    const { data } = await supabase.from("favorites").select("item_key");
    setKeys(new Set((data || []).map((r) => r.item_key as string)));
    setReady(true);
  }, [supabase]);

  useEffect(() => {
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isFavorite = useCallback((key: string) => keys.has(key), [keys]);

  const toggle = useCallback(
    async (item: FavoriteItem) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Not logged in → send to account/login
        router.push("/account");
        return;
      }

      const has = keys.has(item.itemKey);
      // optimistic update
      setKeys((prev) => {
        const next = new Set(prev);
        if (has) next.delete(item.itemKey);
        else next.add(item.itemKey);
        return next;
      });

      if (has) {
        await supabase.from("favorites").delete()
          .eq("user_id", user.id).eq("item_key", item.itemKey);
      } else {
        await supabase.from("favorites").insert({
          user_id: user.id,
          item_key: item.itemKey,
          name: item.name,
          image_url: item.imageUrl || "",
          href: item.href || "",
          subtitle: item.subtitle || "",
        });
      }
    },
    [keys, supabase, router]
  );

  return (
    <Ctx.Provider value={{ ready, loggedIn, keys, isFavorite, toggle }}>
      {children}
    </Ctx.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useFavorites must be used within FavoritesProvider");
  return ctx;
}
