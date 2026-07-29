/**
 * Scraper for the take.app storefronts the four restaurants order through.
 *
 * take.app exposes no public catalogue API, and the product data is rendered
 * straight into HTML (Mantine markup) rather than served as JSON — so the menu
 * is read from each store's sitemap: every `/c/<id>` category page lists its
 * products as anchors pointing at `/p/<id>`.
 *
 * Because this parses someone else's markup it is deliberately forgiving: a
 * category that fails to parse is skipped and reported rather than failing the
 * whole sync, and every field except the id and name is optional.
 */

export interface ScrapedItem {
  externalId: string;
  name: string;
  price: number | null;
  imageUrl: string | null;
  category: string | null;
  categoryExternalId: string | null;
  productUrl: string;
}

export interface ScrapeResult {
  items: ScrapedItem[];
  categoriesFound: number;
  categoriesFailed: string[];
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";

/** Space class covering the non-breaking space take.app renders in prices. */
const SP = "[\\s\\u00a0]";

async function fetchText(url: string, timeoutMs = 20000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,application/xml" },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

/** Minimal entity decode — product names realistically only carry these. */
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;|&#x27;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

/** Category page titles read "Pizza - Minibox Restaurant". */
function categoryNameFromTitle(html: string): string | null {
  const m = /<title>([^<]*)<\/title>/i.exec(html);
  if (!m) return null;
  const title = decodeEntities(m[1]);
  const idx = title.lastIndexOf(" - ");
  return (idx > 0 ? title.slice(0, idx) : title).trim() || null;
}

function normaliseUrl(base: string): string {
  return base.replace(/\/+$/, "");
}

/** Pull the `/c/<id>` category page URLs out of a store's sitemap. */
export async function fetchCategoryUrls(baseUrl: string): Promise<string[]> {
  const base = normaliseUrl(baseUrl);
  const xml = await fetchText(`${base}/sitemap.xml`);
  const ids = new Set<string>();
  const re = /\/c\/([a-z0-9]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) ids.add(m[1]);
  return Array.from(ids).map((id) => `${base}/c/${id}`);
}

/** Parse the product cards out of one rendered category page. */
export function parseCategoryPage(
  html: string,
  baseUrl: string,
  categoryExternalId: string | null
): ScrapedItem[] {
  const base = normaliseUrl(baseUrl);
  const category = categoryNameFromTitle(html);
  const items: ScrapedItem[] = [];
  const seen = new Set<string>();

  // Price renders as "AED&nbsp;25.00". Fall back to a bare decimal paragraph in
  // case a store is configured without the currency code.
  const priceWithCode = new RegExp(`>AED${SP}*([0-9][0-9,]*(?:\\.[0-9]{1,2})?)</p>`, "i");
  const priceBare = new RegExp(`>${SP}*([0-9][0-9,]*\\.[0-9]{2})${SP}*</p>`);

  // Each product card is an anchor to /p/<id>; split on those boundaries so a
  // card's fields cannot bleed into its neighbour.
  const blocks = html.split(/(?=<a [^>]*href="https:\/\/take\.app\/[^/"]+\/p\/)/);

  for (const block of blocks.slice(1)) {
    const idMatch = /href="https:\/\/take\.app\/[^/"]+\/p\/([a-z0-9]+)"/i.exec(block);
    if (!idMatch) continue;
    const externalId = idMatch[1];
    if (seen.has(externalId)) continue;

    const end = block.indexOf("</a>");
    const card = end > 0 ? block.slice(0, end) : block;

    const nameMatch = /font-weight:600"[^>]*>([^<]+)<\/p>/i.exec(card);
    if (!nameMatch) continue;
    const name = decodeEntities(nameMatch[1]);
    if (!name) continue;

    const priceMatch = priceWithCode.exec(card) ?? priceBare.exec(card);
    const price = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, "")) : null;

    // Products without a photo render a placeholder SVG instead of an <img>.
    const imgMatch = /<img[^>]+src="([^"]+)"/i.exec(card);

    seen.add(externalId);
    items.push({
      externalId,
      name,
      price: price !== null && Number.isFinite(price) ? price : null,
      imageUrl: imgMatch ? decodeEntities(imgMatch[1]) : null,
      category,
      categoryExternalId,
      // Link to the restaurant's own domain rather than take.app.
      productUrl: `${base}/p/${externalId}`,
    });
  }

  return items;
}

/** Run `fn` with a small concurrency cap so a sync doesn't hammer the store. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * Scrape a whole storefront. A product listed under several categories is kept
 * once, under the first category that yielded it.
 */
export async function scrapeStore(baseUrl: string): Promise<ScrapeResult> {
  const categoryUrls = await fetchCategoryUrls(baseUrl);
  const categoriesFailed: string[] = [];

  const perCategory = await mapLimit(categoryUrls, 4, async (url) => {
    try {
      const html = await fetchText(url);
      const categoryExternalId = /\/c\/([a-z0-9]+)/i.exec(url)?.[1] ?? null;
      return parseCategoryPage(html, baseUrl, categoryExternalId);
    } catch {
      categoriesFailed.push(url);
      return [] as ScrapedItem[];
    }
  });

  const byId = new Map<string, ScrapedItem>();
  for (const items of perCategory) {
    for (const item of items) if (!byId.has(item.externalId)) byId.set(item.externalId, item);
  }

  return {
    items: Array.from(byId.values()),
    categoriesFound: categoryUrls.length,
    categoriesFailed,
  };
}
