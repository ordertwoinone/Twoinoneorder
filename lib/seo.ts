// Central SEO configuration + JSON-LD structured-data builders.
// Pure data/markup — nothing here renders visible UI, so it never affects design.

export const SITE_URL = "https://www.twoinoneorder.com";

export const BUSINESS = {
  name: "Two In One UAE",
  legalName: "Two In One",
  url: SITE_URL,
  logo: `${SITE_URL}/logos/two-in-one.png`,
  description:
    "Two In One — your one-stop destination for great food in the UAE. Order karak, falafel, snacks & bakery, book a table, enjoy the buffet or arrange catering near University City, Kalba, Sharjah.",
  phone: "+971522305216",
  email: "hello@twoinoneae.com",
  whatsapp: "971522305216",
  priceRange: "$$",
  // Physical venue (University Kalba branch)
  address: {
    street: "University City",
    locality: "Kalba",
    region: "Sharjah",
    country: "AE",
  },
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=University+City+Kalba+Sharjah",
  cuisines: [
    "Karak",
    "Falafel",
    "Egyptian",
    "Shawarma",
    "Bakery",
    "Indian Snacks",
    "Buffet",
    "Beverages",
  ],
  openingHours: "Mo-Su 07:00-00:00",
  social: [
    // Filled from site_settings at runtime where available; safe defaults kept empty.
  ] as string[],
} as const;

type Json = Record<string, unknown>;

/** Organization schema — identifies the brand to search engines. */
export function organizationSchema(sameAs: string[] = []): Json {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: BUSINESS.name,
    legalName: BUSINESS.legalName,
    url: SITE_URL,
    logo: BUSINESS.logo,
    image: BUSINESS.logo,
    description: BUSINESS.description,
    email: BUSINESS.email,
    telephone: BUSINESS.phone,
    ...(sameAs.length ? { sameAs } : {}),
    contactPoint: {
      "@type": "ContactPoint",
      telephone: BUSINESS.phone,
      contactType: "customer service",
      areaServed: "AE",
      availableLanguage: ["en", "ar"],
    },
  };
}

/** WebSite schema with a sitelinks search box. */
export function webSiteSchema(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: BUSINESS.name,
    description: BUSINESS.description,
    publisher: { "@id": `${SITE_URL}/#organization` },
    inLanguage: "en",
  };
}

interface RestaurantInput {
  name: string;
  description: string;
  url: string;
  image?: string;
  servesCuisine?: string[];
  openingHours?: string;
  rating?: { value: string | number; count: string | number };
  menuUrl?: string;
  acceptsReservations?: boolean;
}

/** Restaurant / LocalBusiness schema for a single venue. */
export function restaurantSchema(input: RestaurantInput): Json {
  const ratingCount =
    input.rating != null
      ? String(input.rating.count).replace(/\D/g, "") || undefined
      : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: input.name,
    description: input.description,
    url: input.url,
    ...(input.image ? { image: input.image } : { image: BUSINESS.logo }),
    servesCuisine: input.servesCuisine ?? [...BUSINESS.cuisines],
    priceRange: BUSINESS.priceRange,
    telephone: BUSINESS.phone,
    email: BUSINESS.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: BUSINESS.address.street,
      addressLocality: BUSINESS.address.locality,
      addressRegion: BUSINESS.address.region,
      addressCountry: BUSINESS.address.country,
    },
    hasMap: BUSINESS.mapsUrl,
    openingHours: input.openingHours ?? BUSINESS.openingHours,
    ...(input.acceptsReservations
      ? { acceptsReservations: "True" }
      : {}),
    ...(input.menuUrl ? { hasMenu: input.menuUrl, menu: input.menuUrl } : {}),
    ...(input.rating && ratingCount
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: String(input.rating.value),
            reviewCount: ratingCount,
            bestRating: "5",
          },
        }
      : {}),
    parentOrganization: { "@id": `${SITE_URL}/#organization` },
  };
}

/** BreadcrumbList schema. Pass ordered [{ name, path }] from home → current. */
export function breadcrumbSchema(items: { name: string; path: string }[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}
