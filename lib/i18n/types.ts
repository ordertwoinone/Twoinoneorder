import type en from "./dictionaries/en";

/**
 * Widened shape of the English dictionary: every leaf becomes `string` (or
 * `readonly string[]`) instead of its literal type. Other locale files are
 * annotated with this, so a missing, extra or misspelled key is a compile
 * error rather than a blank space on the page.
 */
/**
 * Permits keys English does not have. Arabic needs six CLDR plural branches
 * (zero/one/two/few/many/other) where English only needs two, so a locale may
 * legitimately carry more keys than the reference dictionary — but never fewer.
 */
interface ExtraKeys {
  readonly [key: string]: unknown;
}

type Widen<T> = T extends readonly string[]
  ? readonly string[]
  : T extends string
    ? string
    : { readonly [K in keyof T]: Widen<T[K]> } & ExtraKeys;

export type Dictionary = Widen<typeof en>;

/** Dot-separated paths that resolve to a single string, e.g. "nav.home". */
type StringPaths<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends readonly string[]
    ? never
    : T[K] extends string
      ? `${Prefix}${K}`
      : StringPaths<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

/** Dot-separated paths that resolve to a list, e.g. "pwa.android". */
type ListPaths<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends readonly string[]
    ? `${Prefix}${K}`
    : T[K] extends string
      ? never
      : ListPaths<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type TranslationKey = StringPaths<typeof en>;
export type TranslationListKey = ListPaths<typeof en>;

/**
 * Base of a plural group: "common.items" for the pair
 * common.items_one / common.items_other.
 */
type StripPluralSuffix<T> = T extends `${infer Base}_other` ? Base : never;
export type PluralKey = StripPluralSuffix<TranslationKey>;

/** Values interpolated into {placeholders}. */
export type TranslationVars = Record<string, string | number>;

/** Flattened dictionary — built once per locale so lookups are a plain map hit. */
export type FlatDictionary = Record<string, string | readonly string[]>;
