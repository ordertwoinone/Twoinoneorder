import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BottomNav from "@/components/layout/BottomNav";
import BuffetContent from "./BuffetContent";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const revalidate = 60;

async function getBuffetData() {
  const [heroRes, bannersRes, featuresRes, timingsRes, dishesRes] = await Promise.all([
    supabaseAdmin.from("buffet_hero").select("*").limit(1).single(),
    supabaseAdmin.from("buffet_banners").select("*").eq("is_active", true).order("sort_order"),
    supabaseAdmin.from("buffet_why_choose_us").select("*").eq("is_active", true).order("sort_order"),
    supabaseAdmin.from("buffet_timings").select("*").eq("is_active", true).order("sort_order"),
    supabaseAdmin.from("buffet_popular_dishes").select("*").eq("is_active", true).order("sort_order"),
  ]);

  return {
    hero:     heroRes.data    ?? null,
    banners:  bannersRes.data ?? [],
    features: featuresRes.data ?? [],
    timings:  timingsRes.data  ?? [],
    dishes:   dishesRes.data   ?? [],
  };
}

export default async function BuffetPage() {
  const data = await getBuffetData();

  return (
    <>
      <Navbar className="hidden sm:block" />
      <main className="bg-white pb-24 sm:pb-0">
        <BuffetContent
          hero={data.hero}
          banners={data.banners}
          features={data.features}
          timings={data.timings}
          dishes={data.dishes}
        />
      </main>
      <Footer />
      <BottomNav />
    </>
  );
}
