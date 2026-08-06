import type { Locale } from "../config";
import type { Dictionary, FlatDictionary } from "../types";
import en from "./en";

/**
 * English is imported statically on purpose: it is what the server renders and
 * what React hydrates against, so it has to be there synchronously. Every other
 * locale is a dynamic import, which webpack emits as its own chunk and the
 * browser only downloads when that language is actually chosen.
 */
const LOADERS: Record<Exclude<Locale, "en">, () => Promise<{ default: Dictionary }>> = {
  ar: () => import("./ar"),
};

/** Depth-first flatten into "a.b.c" → value, done once per locale. */
function flatten(node: unknown, prefix = "", out: Record<string, string | readonly string[]> = {}) {
  if (typeof node === "string" || Array.isArray(node)) {
    out[prefix] = node as string | readonly string[];
    return out;
  }
  if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      flatten(value, prefix ? `${prefix}.${key}` : key, out);
    }
  }
  return out;
}

const cache = new Map<Locale, FlatDictionary>();

/** English is always resident — it doubles as the fallback for any missing key. */
export const EN_FLAT: FlatDictionary = flatten(en);
cache.set("en", EN_FLAT);

export function getCachedDictionary(locale: Locale): FlatDictionary | undefined {
  return cache.get(locale);
}

/** Resolves immediately for an already-loaded locale, otherwise fetches the chunk. */
export async function loadDictionary(locale: Locale): Promise<FlatDictionary> {
  const cached = cache.get(locale);
  if (cached) return cached;

  const loader = LOADERS[locale as Exclude<Locale, "en">];
  if (!loader) return EN_FLAT;

  try {
    const mod = await loader();
    const flat = flatten(mod.default);
    cache.set(locale, flat);
    return flat;
  } catch {
    // A failed chunk must never blank the site — fall back to English.
    return EN_FLAT;
  }
}
