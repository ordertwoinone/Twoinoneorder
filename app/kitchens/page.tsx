import type { Metadata } from "next";
import { Archivo_Narrow } from "next/font/google";
import { kitchenDishes } from "@/data/kitchenDishes";
import PageMeta from "@/lib/i18n/PageMeta";
import { dishFromRow, type KitchenDishRow } from "@/lib/kitchens";
import { supabaseAdmin } from "@/lib/supabase-admin";
import KitchensContent from "./KitchensContent";

export const revalidate = 60;

// The condensed heading face. Loaded here so only this route pays for it.
const heading = Archivo_Narrow({
  subsets: ["latin"],
  variable: "--font-kitchens-heading",
  weight: ["700"],
  display: "swap",
});

/* Kept out of search results while orders can't be placed from the page. */
export const metadata: Metadata = {
  title: "Italian & Turkish Kitchens",
  description: "Breakfast, lunch and dinner from our Italian and Turkish kitchens.",
  robots: { index: false, follow: false },
};

export default async function KitchensPage() {
  /* A missing table reads the same as an empty one: the samples stay up until
     supabase/kitchen_dishes.sql has been run and a dish added. */
  const { data } = await supabaseAdmin
    .from("kitchen_dishes")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  const rows = (data ?? []) as KitchenDishRow[];

  return (
    <>
      <PageMeta titleKey="kitchens.metaTitle" descriptionKey="kitchens.metaDescription" />
      <KitchensContent
        fontClass={heading.variable}
        dishes={rows.length > 0 ? rows.map(dishFromRow) : kitchenDishes}
        isSample={rows.length === 0}
      />
    </>
  );
}
