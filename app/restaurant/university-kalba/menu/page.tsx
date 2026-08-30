import { Suspense } from "react";
import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BottomNav from "@/components/layout/BottomNav";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { orderWhatsapp } from "@/lib/whatsapp";
import { getAddonGroupsByItem } from "@/lib/kalba/addons-server";
import { sellable } from "@/lib/kiosk/server";
import JsonLd from "@/components/seo/JsonLd";
import PageMeta from "@/lib/i18n/PageMeta";
import { breadcrumbSchema } from "@/lib/seo";
import MenuContent from "./MenuContent";
import type { KalbaPopularItem, KalbaCategory, KalbaHero } from "../KalbaContent";

export const revalidate = 60;

const DEFAULT_HERO_PARTIAL = {
  name: "Two in One University Kalba",
  whatsapp: "971522305216",
};

async function getMenuData() {
  const [heroRes, catsRes, popularRes, settingsRes, groupsByItem] = await Promise.all([
    supabaseAdmin.from("kalba_hero").select("name, whatsapp, pickup_lead_minutes, closes_at, opening_hours, is_open").limit(1).single(),
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
    supabaseAdmin.from("site_settings").select("whatsapp_number").single(),
    getAddonGroupsByItem(),
  ]);

  const hero = (heroRes.data ?? DEFAULT_HERO_PARTIAL) as Pick<KalbaHero, "name" | "whatsapp" | "pickup_lead_minutes" | "closes_at" | "opening_hours" | "is_open">;

  return {
    // The branch number wins; blank falls back to admin → Settings.
    hero: { ...hero, whatsapp: orderWhatsapp(hero.whatsapp, settingsRes.data?.whatsapp_number) },
    categories: (catsRes.data ?? []) as KalbaCategory[],
    // Each dish carries its own extras, so the cart never has to go looking.
    /* A dish nobody has priced is left off, the same as on the kiosk and the
       till. It was rendering as "AED 0" beside a real photo, which reads as a
       free lunch rather than as a gap in the admin panel. It comes back the
       moment a price is typed in. */
    popular: ((popularRes.data ?? []) as KalbaPopularItem[])
      .filter((item) => sellable(item))
      .map((item) => ({ ...item, addon_groups: groupsByItem[item.id] ?? [] })),
  };
}

export const metadata: Metadata = {
  title: "University Kalba — Full Menu",
  description:
    "Browse the full menu at Two in One University Kalba. Student-friendly prices, fresh food made to order.",
  alternates: { canonical: "/restaurant/university-kalba/menu" },
};

const menuBreadcrumb = breadcrumbSchema([
  { name: "Home", path: "/" },
  { name: "University Kalba", path: "/restaurant/university-kalba" },
  { name: "Menu", path: "/restaurant/university-kalba/menu" },
]);

export default async function KalbaMenuPage() {
  const { hero, categories, popular } = await getMenuData();

  return (
    <>
      <PageMeta titleKey="menuPage.metaTitle" descriptionKey="menuPage.metaDescription" />
      <JsonLd data={menuBreadcrumb} />
      <Navbar />
      <main className="bg-white min-h-screen pb-cart-bar">
        <Suspense fallback={<div className="min-h-screen" />}>
          <MenuContent
            popular={popular}
            categories={categories}
            whatsapp={hero.whatsapp}
            pickupLeadMinutes={hero.pickup_lead_minutes ?? 30}
            closesAt={hero.closes_at ?? ""}
            openingHours={hero.opening_hours ?? []}
            isOpen={hero.is_open ?? true}
            restaurantName={hero.name}
          />
        </Suspense>
      </main>
      <Footer />
      <BottomNav />
    </>
  );
}
