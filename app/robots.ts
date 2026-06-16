import type { MetadataRoute } from "next";

const SITE_URL = "https://www.twoinoneorder.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/", "/account/", "/confirm-booking", "/reservation"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
