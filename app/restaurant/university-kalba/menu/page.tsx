import { Suspense } from "react";
import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BottomNav from "@/components/layout/BottomNav";
import WhatsAppButton from "@/components/layout/WhatsAppButton";
import { supabaseAdmin } from "@/lib/supabase-admin";
import MenuContent from "./MenuContent";
import type { KalbaPopularItem, KalbaCategory, KalbaHero } from "../KalbaContent";

export const revalidate = 60;

const DEFAULT_HERO_PARTIAL = {
  name: "Two in One University Kalba",
  whatsapp: "971522305216",
};

async function getMenuData() {
  const [heroRes, catsRes, popularRes] = await Promise.all([
    supabaseAdmin.from("kalba_hero").select("name, whatsapp").limit(1).single(),
    supabaseAdmin
      .from("kalba_categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order"),
    supabaseAdmin
      .from("kalba_popular_items")
      .select("*")
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  return {
    hero: (heroRes.data ?? DEFAULT_HERO_PARTIAL) as Pick<KalbaHero, "name" | "whatsapp">,
    categories: (catsRes.data ?? []) as KalbaCategory[],
    popular: (popularRes.data ?? []) as KalbaPopularItem[],
  };
}

export const metadata: Metadata = {
  title: "Full Menu — Two in One University Kalba",
  description:
    "Browse the full menu at Two in One University Kalba. Student-friendly prices, fresh food made to order.",
};

export default async function KalbaMenuPage() {
  const { hero, categories, popular } = await getMenuData();

  return (
    <>
      <Navbar />
      <main className="bg-white min-h-screen pb-24 sm:pb-0">
        <Suspense fallback={<div className="min-h-screen" />}>
          <MenuContent
            popular={popular}
            categories={categories}
            whatsapp={hero.whatsapp}
            restaurantName={hero.name}
          />
        </Suspense>
      </main>
      <Footer />
      <BottomNav />
      <WhatsAppButton />
    </>
  );
}
