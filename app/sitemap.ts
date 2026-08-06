import type { MetadataRoute } from "next";
import { LOCALES, LOCALE_META, LOCALE_QUERY_PARAM } from "@/lib/i18n/config";

const SITE_URL = "https://www.twoinoneorder.com";

const ROUTES: { path: string; changeFrequency: "daily" | "weekly" | "monthly"; priority: number }[] = [
  { path: "",                                 changeFrequency: "daily",   priority: 1 },
  { path: "/restaurant/buffet",               changeFrequency: "weekly",  priority: 0.9 },
  { path: "/restaurant/university-kalba",     changeFrequency: "weekly",  priority: 0.9 },
  { path: "/restaurant/university-kalba/menu", changeFrequency: "weekly", priority: 0.8 },
  { path: "/offers",                          changeFrequency: "weekly",  priority: 0.8 },
  { path: "/catering",                        changeFrequency: "monthly", priority: 0.8 },
  { path: "/book-table",                      changeFrequency: "monthly", priority: 0.7 },
];

/**
 * Both languages are served from the same URL and switched on the client, so
 * `?lang=` is what gives each one a distinct, linkable address. Declaring the
 * pair here is how crawlers learn about the Arabic version without needing to
 * execute the page's JavaScript.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return ROUTES.map(({ path, changeFrequency, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority,
    alternates: {
      languages: Object.fromEntries(
        LOCALES.map((code) => [
          LOCALE_META[code].htmlLang,
          `${SITE_URL}${path}?${LOCALE_QUERY_PARAM}=${code}`,
        ]),
      ),
    },
  }));
}
