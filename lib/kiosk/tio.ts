/**
 * TIO, the kiosk's assistant — everything about it that is not a network call.
 *
 * Shared by the screen and by /api/kiosk/tio. The rules in here are not a
 * lesser copy of the AI: they are what the customer gets whenever the AI is
 * slow, out of allowance, or has no key configured, so a suggestion never waits
 * on OpenAI and a panel without a key still suggests something sensible.
 *
 * The one thing TIO is never allowed to do, AI or not, is say a dish is safe
 * for an allergy. The menu does not hold ingredient data complete enough for
 * that, and a wrong "no nuts" is not a bad suggestion, it is a hospital visit.
 * Every allergy-shaped question gets the counter disclaimer, decided here by
 * pattern rather than left to the model to remember.
 */

import type { KioskLang } from "@/lib/kiosk/i18n";
import type { KioskCategory, KioskItem } from "@/lib/kiosk/types";
import { itemPrice } from "@/lib/kiosk/cart";

/** pair: a dish just went in. checkout: the basket is being reviewed. ask: the Help-me-choose sheet. */
export type TioKind = "pair" | "checkout" | "ask";

export type TioChipKey = "spicy" | "veg" | "cheap" | "sweet" | "drink" | "filling" | "surprise";

export interface TioRequest {
  kind: TioKind;
  lang: KioskLang;
  /** Ids of the dishes already in the basket. */
  cart: string[];
  /** pair only: the dish that was just added. */
  added?: string;
  /** pair and checkout: dishes TIO has already put forward to this customer. */
  exclude?: string[];
  /** ask only: what the customer typed, or a chip's label. */
  query?: string;
  /** ask only: set when the query came from a chip, so the rules can answer it too. */
  chip?: TioChipKey;
}

export interface TioReply {
  message: string;
  /** Real, orderable dishes, never more than TIO_MAX_RESULTS. */
  itemIds: string[];
  /** The question touched on allergies or ingredients: show the warning. */
  allergy: boolean;
  source: "ai" | "rules";
}

export const TIO_MAX_RESULTS = 4;
export const TIO_QUERY_MAX = 160;
export const TIO_CHEAP_UNDER = 15;

/* ─── Allergies ─────────────────────────────────────────────────────────── */

/* English on word boundaries, so "minutes" is not a question about nuts.
   Arabic without them: \b only knows Latin letters. */
const ALLERGY_WORDS =
  /\b(allerg\w*|intoleran\w*|nuts?|nutty|peanuts?|almonds?|cashews?|pistachios?|gluten\w*|wheat|celiac|coeliac|dairy|milk|lactose|eggs?|soy|soya|sesame|shellfish|shrimps?|prawns?|fish|mustard|celery|ingredients?|contains?)\b|حساسي|مكسرات|فول سوداني|لوز|كاجو|فستق|جلوتين|غلوتين|قمح|حليب|ألبان|لاكتوز|بيض|صويا|سمسم|سمك|روبيان|جمبري|مكونات|يحتوي/i;

export function looksLikeAllergyQuestion(text: string | undefined): boolean {
  return Boolean(text && ALLERGY_WORDS.test(text));
}

const ALLERGY_NOTE: Record<KioskLang, string> = {
  en: "Allergy? Please confirm with our staff at the counter before ordering — ingredients can change and kitchens share equipment.",
  ar: "لديك حساسية؟ يرجى التأكد من موظفينا عند الكاشير قبل الطلب — قد تتغير المكونات وتُستخدم نفس أدوات المطبخ.",
};

export function allergyNote(lang: KioskLang): string {
  return ALLERGY_NOTE[lang];
}

/* ─── The idle screen ───────────────────────────────────────────────────── */

/**
 * What TIO says to nobody in particular. Two lines per part of the day, turned
 * over on the idle screen. Not AI: it is said a thousand times a day to people
 * walking past, and the same good sentence is better than a paid-for new one.
 */
export function tioGreetings(lang: KioskLang, now = new Date()): string[] {
  const hour = now.getHours();
  const part = hour < 11 ? "morning" : hour < 16 ? "afternoon" : hour < 21 ? "evening" : "night";
  const lines: Record<KioskLang, Record<string, string[]>> = {
    en: {
      morning: ["Good morning! ☀️ Breakfast is ready.", "Hi, I'm TIO! Tap me if you need help choosing."],
      afternoon: ["Good afternoon! Hungry? 😋", "Hi, I'm TIO! Tap me and I'll help you pick."],
      evening: ["Good evening! Dinner time 🍔", "Not sure what to get? Tap me — I'm TIO!"],
      night: ["Late-night snack? 🌙 We've got you.", "Hi, I'm TIO! Tap me if you need help choosing."],
    },
    ar: {
      morning: ["صباح الخير! ☀️ الفطور جاهز.", "أهلاً، أنا TIO! اضغط عليّ لأساعدك في الاختيار."],
      afternoon: ["مساء الخير! جائع؟ 😋", "أهلاً، أنا TIO! اضغط عليّ وسأساعدك."],
      evening: ["مساء الخير! وقت العشاء 🍔", "محتار ماذا تطلب؟ اضغط عليّ — أنا TIO!"],
      night: ["وجبة خفيفة متأخرة؟ 🌙 نحن هنا.", "أهلاً، أنا TIO! اضغط عليّ لأساعدك في الاختيار."],
    },
  };
  return lines[lang][part];
}

/* ─── Help me choose ────────────────────────────────────────────────────── */

export const TIO_CHIPS: { key: TioChipKey; en: string; ar: string }[] = [
  { key: "spicy", en: "Something spicy 🌶️", ar: "شيء حار 🌶️" },
  { key: "veg", en: "Vegetarian 🥗", ar: "نباتي 🥗" },
  { key: "cheap", en: `Under AED ${TIO_CHEAP_UNDER} 💸`, ar: `أقل من ${TIO_CHEAP_UNDER} درهم 💸` },
  { key: "sweet", en: "Something sweet 🍰", ar: "شيء حلو 🍰" },
  { key: "drink", en: "A cold drink 🥤", ar: "مشروب بارد 🥤" },
  { key: "filling", en: "I'm really hungry 🍔", ar: "أنا جائع جداً 🍔" },
  { key: "surprise", en: "Surprise me ✨", ar: "فاجئني ✨" },
];

export function isTioChip(value: unknown): value is TioChipKey {
  return TIO_CHIPS.some((c) => c.key === value);
}

/* What a category is, read from how it was named. Admin types the labels, so
   this is a best guess — which is all a fallback needs to be. */
const DRINK = /drink|juice|coffee|tea|karak|shake|smoothie|soda|water|mojito|latte|beverage|lemonade|مشروب|عصير|قهوة|شاي|كرك|ميلك|موهيتو/i;
const COLD = /cold|juice|soft|soda|tin|shake|smoothie|mojito|iced|water|بارد|عصير|غازي/i;
const SWEET = /dessert|sweet|cake|ice ?cream|waffle|crepe|brownie|cookie|donut|kunafa|حلو|حلويات|كيك|آيس|ايس|وافل|كريب|كنافة/i;

function categoryText(item: KioskItem, categories: KioskCategory[]): string {
  const category = categories.find((c) => c.id === item.category_id);
  return `${category?.label ?? ""} ${category?.label_ar ?? ""} ${item.name}`;
}

/** The better-selling, better-value dishes first — the order the rules pick from. */
function byAppeal(a: KioskItem, b: KioskItem): number {
  const picks = Number(Boolean(b.show_in_top_picks)) - Number(Boolean(a.show_in_top_picks));
  if (picks !== 0) return picks;
  const offer = Number(b.discount_percent ?? 0) - Number(a.discount_percent ?? 0);
  if (offer !== 0) return offer;
  return (a.top_picks_order ?? 999) - (b.top_picks_order ?? 999);
}

/**
 * One dish to go with what is in the basket, without asking anyone.
 *
 * Something from a category the basket does not have yet — a burger wants a
 * drink, not a second burger — and a best seller if there is one.
 */
export function ruleSuggestion(
  items: KioskItem[],
  categories: KioskCategory[],
  cart: string[],
  exclude: string[] = [],
): KioskItem | null {
  const inCart = new Set(cart);
  const skip = new Set(exclude);
  const cartCategories = new Set(
    items.filter((i) => inCart.has(i.id)).map((i) => i.category_id ?? ""),
  );
  const candidates = items.filter((i) => !inCart.has(i.id) && !skip.has(i.id));
  const fresh = candidates.filter((i) => !cartCategories.has(i.category_id ?? ""));

  /* A meal is missing a drink before it is missing anything else, then
     something sweet; only after both does "any other section" make sense. */
  const cartText = items.filter((i) => inCart.has(i.id)).map((i) => categoryText(i, categories)).join(" ");
  const wants = [
    !DRINK.test(cartText) ? DRINK : null,
    !SWEET.test(cartText) ? SWEET : null,
  ].filter((w): w is RegExp => w !== null);
  for (const want of wants) {
    const match = fresh.filter((i) => want.test(categoryText(i, categories))).sort(byAppeal)[0];
    if (match) return match;
  }
  return [...fresh].sort(byAppeal)[0] ?? null;
}

/** A chip answered from the menu's own tags and prices. */
export function ruleChipResults(
  chip: TioChipKey,
  items: KioskItem[],
  categories: KioskCategory[],
  cart: string[],
): KioskItem[] {
  const inCart = new Set(cart);
  const pool = items.filter((i) => !inCart.has(i.id));
  const tests: Record<TioChipKey, (i: KioskItem) => boolean> = {
    spicy: (i) => (i.tags ?? []).includes("spicy"),
    veg: (i) => (i.tags ?? []).includes("veg"),
    cheap: (i) => itemPrice(i) > 0 && itemPrice(i) < TIO_CHEAP_UNDER,
    sweet: (i) => SWEET.test(categoryText(i, categories)),
    drink: (i) => DRINK.test(categoryText(i, categories)),
    filling: (i) => !DRINK.test(categoryText(i, categories)) && !SWEET.test(categoryText(i, categories)) && itemPrice(i) >= TIO_CHEAP_UNDER,
    surprise: (i) => Boolean(i.show_in_top_picks),
  };
  let found = pool.filter(tests[chip]).sort(byAppeal);
  // The chip says cold. Hot drinks only when the menu has no cold ones.
  if (chip === "drink") {
    const cold = found.filter((i) => COLD.test(categoryText(i, categories)));
    if (cold.length > 0) found = cold;
  }
  if (chip === "surprise") {
    const from = found.length > 0 ? found : pool;
    return [...from].sort(() => Math.random() - 0.5).slice(0, TIO_MAX_RESULTS);
  }
  return found.slice(0, TIO_MAX_RESULTS);
}

const BEST_WORDS = /\b(best|top|popular|recommend\w*|favou?rite|famous|must ?try|good)\b|أفضل|الأكثر|طلبا|مشهور|ينصح/i;
const OFFER_WORDS = /\b(offer|discount|deal|promo|cheap|price)\b|عرض|خصم|رخيص|سعر/i;
const SPICY_WORDS = /\bspic\w*|hot\b|حار/i;
const VEG_WORDS = /\bveg\w*|vegetarian|نباتي/i;
const HUNGRY_WORDS = /\bhungry|filling|big|large|جوعان|جائع/i;

/**
 * What a typed question is actually asking for, read from its own words.
 *
 * This is the one place a customer's free text is looked at without OpenAI:
 * no key configured, the request timed out, or the account is out of
 * allowance are all the same case here — the kiosk still has a live menu and
 * a keyboard's worth of hints about what somebody wants from it. Never comes
 * back empty: the last resort is the same best sellers the idle screen and
 * the Popular filter already lead with, which beats sending someone away
 * with nothing.
 */
export function ruleAskFallback(
  query: string,
  items: KioskItem[],
  categories: KioskCategory[],
  cart: string[],
): KioskItem[] {
  const inCart = new Set(cart);
  const pool = items.filter((i) => !inCart.has(i.id));

  const tests: [RegExp, (i: KioskItem) => boolean][] = [
    [BEST_WORDS, (i) => Boolean(i.show_in_top_picks)],
    [OFFER_WORDS, (i) => toPercentOrZero(i) > 0 || (itemPrice(i) > 0 && itemPrice(i) < TIO_CHEAP_UNDER)],
    [SPICY_WORDS, (i) => (i.tags ?? []).includes("spicy")],
    [VEG_WORDS, (i) => (i.tags ?? []).includes("veg")],
    [DRINK, (i) => DRINK.test(categoryText(i, categories))],
    [SWEET, (i) => SWEET.test(categoryText(i, categories))],
    [HUNGRY_WORDS, (i) => itemPrice(i) >= TIO_CHEAP_UNDER],
  ];

  for (const [pattern, test] of tests) {
    if (!pattern.test(query)) continue;
    const found = pool.filter(test).sort(byAppeal);
    if (found.length > 0) return found.slice(0, TIO_MAX_RESULTS);
  }

  // Nothing in the question matched anything. Best sellers rather than nothing.
  return [...pool].sort(byAppeal).slice(0, TIO_MAX_RESULTS);
}

function toPercentOrZero(item: KioskItem): number {
  const n = Number(item.discount_percent ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/** The sentence TIO puts on a rule-picked dish. */
export function ruleMessage(kind: TioKind, lang: KioskLang, name: string, found = true): string {
  if (lang === "ar") {
    if (kind === "pair") return `${name} يتماشى رائعاً مع طلبك! 😋`;
    if (kind === "checkout") return `أكمل وجبتك مع ${name}؟`;
    return found ? "إليك بعض الخيارات التي قد تعجبك:" : "لم أجد شيئاً مطابقاً الآن — جرّب خياراً آخر.";
  }
  if (kind === "pair") return `${name} goes great with that! 😋`;
  if (kind === "checkout") return `Complete your meal with ${name}?`;
  return found ? "Here are a few you might like:" : "I couldn't find a match right now — try another option.";
}

/* ─── From the screen ───────────────────────────────────────────────────── */

export const TIO_AVATAR = "/tio/tio-face.webp";

/**
 * Ask /api/kiosk/tio. Null on any failure: every caller treats "no answer" as
 * "say nothing", apart from the sheet, which says so itself.
 */
export async function fetchTio(
  req: TioRequest,
  signal?: AbortSignal,
): Promise<{ reply: TioReply | null; error: string }> {
  try {
    const res = await fetch("/api/kiosk/tio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
      signal,
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) return { reply: null, error: typeof body?.error === "string" ? body.error : "" };
    return { reply: body as TioReply, error: "" };
  } catch {
    return { reply: null, error: "" };
  }
}
