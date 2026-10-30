import type { Metadata } from "next";
import { Archivo_Narrow } from "next/font/google";
import PageMeta from "@/lib/i18n/PageMeta";
import KitchensContent from "./KitchensContent";

// The condensed heading face. Loaded here so only this route pays for it.
const heading = Archivo_Narrow({
  subsets: ["latin"],
  variable: "--font-kitchens-heading",
  weight: ["700"],
  display: "swap",
});

/* Sample dishes and prices, so it stays out of search results until it is
   backed by a real menu. */
export const metadata: Metadata = {
  title: "Italian & Turkish Kitchens",
  description: "Breakfast, lunch and dinner from our Italian and Turkish kitchens.",
  robots: { index: false, follow: false },
};

export default function KitchensPage() {
  return (
    <>
      <PageMeta titleKey="kitchens.metaTitle" descriptionKey="kitchens.metaDescription" />
      <KitchensContent fontClass={heading.variable} />
    </>
  );
}
