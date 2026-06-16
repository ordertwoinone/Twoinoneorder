import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BottomNav from "@/components/layout/BottomNav";
import BuffetContent from "./BuffetContent";
import JsonLd from "@/components/seo/JsonLd";
import { SITE_URL, restaurantSchema, breadcrumbSchema } from "@/lib/seo";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Buffet Restaurant — All-You-Can-Eat in Kalba",
  description:
    "Enjoy the Two In One buffet near University City, Kalba — fresh dishes, great variety and value for money. See timings, popular dishes and the full buffet menu.",
  alternates: { canonical: "/restaurant/buffet" },
  openGraph: {
    title: "Two In One Buffet — All-You-Can-Eat in Kalba",
    description:
      "Fresh dishes, great variety and value for money at the Two In One buffet near University City, Kalba.",
    url: `${SITE_URL}/restaurant/buffet`,
    type: "website",
  },
};

const buffetSchema = restaurantSchema({
  name: "Two In One Buffet",
  description:
    "All-you-can-eat buffet near University City, Kalba — fresh dishes, great variety and value for money.",
  url: `${SITE_URL}/restaurant/buffet`,
  servesCuisine: ["Buffet", "Arabic", "Indian", "International"],
  menuUrl: `${SITE_URL}/restaurant/buffet`,
});

const buffetBreadcrumb = breadcrumbSchema([
  { name: "Home", path: "/" },
  { name: "Buffet", path: "/restaurant/buffet" },
]);

async function getBuffetData() {
  const [heroRes, bannersRes, featuresRes, timingsRes, dishesRes, sectionsRes] = await Promise.all([
    supabaseAdmin.from("buffet_hero").select("*").limit(1).single(),
    supabaseAdmin.from("buffet_banners").select("*").eq("is_active", true).order("sort_order"),
    supabaseAdmin.from("buffet_why_choose_us").select("*").eq("is_active", true).order("sort_order"),
    supabaseAdmin.from("buffet_timings").select("*").eq("is_active", true).order("sort_order"),
    supabaseAdmin.from("buffet_popular_dishes").select("*").eq("is_active", true).order("sort_order"),
    supabaseAdmin.from("buffet_menu_sections").select("*, buffet_menu_items(*)")
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  // Sort items within each section by sort_order
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const menuSections = (sectionsRes.data ?? []).map((s: any) => ({
    ...s,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    buffet_menu_items: Array.isArray(s.buffet_menu_items)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? [...s.buffet_menu_items].sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      : [],
  }));

  const settingsRes = await supabaseAdmin
    .from("site_settings")
    .select("whatsapp_number")
    .single();

  return {
    hero:         heroRes.data    ?? null,
    banners:      bannersRes.data ?? [],
    features:     featuresRes.data ?? [],
    timings:      timingsRes.data  ?? [],
    dishes:       dishesRes.data   ?? [],
    menuSections,
    whatsapp:     (settingsRes.data?.whatsapp_number || "971522305216").replace(/\D/g, ""),
  };
}

export default async function BuffetPage() {
  const data = await getBuffetData();

  return (
    <>
      <JsonLd data={[buffetSchema, buffetBreadcrumb]} />
      <Navbar className="hidden sm:block" />
      <main className="bg-white pb-24 sm:pb-0">
        <BuffetContent
          hero={data.hero}
          banners={data.banners}
          features={data.features}
          timings={data.timings}
          dishes={data.dishes}
          menuSections={data.menuSections}
          whatsapp={data.whatsapp}
        />
      </main>
      <Footer />
      <BottomNav />
    </>
  );
}
