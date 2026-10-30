import type { Metadata } from "next";
import { Archivo_Narrow } from "next/font/google";
import { kitchenDishes, sampleAddonGroups } from "@/data/kitchenDishes";
import { sizedImage } from "@/lib/image-url";
import { getKitchenAddonGroups } from "@/lib/kalba/addons-server";
import PageMeta from "@/lib/i18n/PageMeta";
import { getKitchenTables } from "@/lib/kitchen-tables";
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

/* For guests already in the restaurant, so it stays out of search results. */
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
  const isSample = rows.length === 0;
  const tables = await getKitchenTables();
  const groups = isSample ? {} : await getKitchenAddonGroups();
  // Option photos show at about 100px.
  const addonGroups = isSample
    ? sampleAddonGroups
    : Object.fromEntries(
        Object.entries(groups).map(([id, list]) => [
          id,
          list.map((g) => ({
            ...g,
            options: g.options.map((o) => ({ ...o, image_url: sizedImage(o.image_url, 200) })),
          })),
        ]),
      );

  return (
    <>
      <PageMeta titleKey="kitchens.metaTitle" descriptionKey="kitchens.metaDescription" />
      <KitchensContent
        fontClass={heading.variable}
        dishes={isSample ? kitchenDishes : rows.map(dishFromRow)}
        addonGroups={addonGroups}
        isSample={isSample}
        tables={tables}
      />
    </>
  );
}
