import type { DishBadge, Kitchen, KitchenDish, Meal } from "@/data/kitchenDishes";
import { sizedImage } from "@/lib/image-url";

export const MEAL_LABELS: Record<Meal, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  cafe: "Two in One Cafe",
};

export const KITCHEN_LABELS: Record<Kitchen, string> = {
  italian: "Italian",
  turkish: "Turkish",
  cafe: "Two in One Cafe",
};

/** The kitchens a breakfast, lunch or dinner dish can come from. */
export const COOKING_KITCHENS: Kitchen[] = ["italian", "turkish"];

export const BADGE_LABELS: Record<DishBadge, string> = {
  pizza: "Pizza favourite",
  bbq: "BBQ & flavour",
  fresh: "Fresh & light",
  morning: "Morning pick",
};

/** A row of the kitchen_dishes table. */
export interface KitchenDishRow {
  id: string;
  meal: Meal;
  kitchen: Kitchen;
  name: string;
  name_ar: string;
  description: string;
  description_ar: string;
  price: number;
  kcal: number | null;
  serves: number;
  image_url: string;
  badge: DishBadge | null;
  is_healthy: boolean;
  is_high_protein: boolean;
  is_favorite?: boolean;
  /** Missing on a database that has not run supabase/kitchen_categories.sql. */
  category_ids?: string[];
  sort_order: number;
  is_active: boolean;
}

/** A row of the kitchen_categories table: a filter chip on /kitchens. */
export interface KitchenCategoryRow {
  id: string;
  name: string;
  name_ar: string;
  sort_order: number;
  is_active: boolean;
}

export type KitchenCategory = Pick<KitchenCategoryRow, "id" | "name" | "name_ar">;

export function parseKitchenCategory(
  body: Record<string, unknown>,
): { row: Omit<KitchenCategoryRow, "id"> } | { error: string } {
  const name = text(body.name).slice(0, 60);
  if (!name) return { error: "Enter a name." };
  return {
    row: {
      name,
      name_ar: text(body.name_ar).slice(0, 60),
      sort_order: Number.isInteger(Number(body.sort_order)) ? Number(body.sort_order) : 0,
      is_active: body.is_active !== false,
    },
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Favourites first, then the closest fit to the party: exact matches, then the
 * nearest size. Of two equally near, the larger one, since it still feeds
 * everybody. Array.sort is stable, so admin's own order holds among equals.
 * Before the party size is known, only the favourites move.
 */
export function sortForMenu<T extends { serves: number; favorite?: boolean }>(dishes: T[], guests: number | null): T[] {
  return [...dishes].sort((a, b) => {
    const favorites = Number(Boolean(b.favorite)) - Number(Boolean(a.favorite));
    if (favorites || guests === null) return favorites;
    return Math.abs(a.serves - guests) - Math.abs(b.serves - guests) || b.serves - a.serves;
  });
}

export function dishFromRow(row: KitchenDishRow): KitchenDish {
  return {
    id: row.id,
    meal: row.meal,
    kitchen: row.kitchen,
    name: row.name,
    name_ar: row.name_ar,
    description: row.description,
    description_ar: row.description_ar,
    price: Number(row.price),
    kcal: row.kcal,
    // Missing on a database that has not added the column yet.
    serves: Number(row.serves) || 1,
    image: sizedImage(row.image_url, 600),
    badge: row.badge ?? undefined,
    healthy: row.is_healthy,
    highProtein: row.is_high_protein,
    favorite: row.is_favorite === true,
    categories: row.category_ids ?? [],
  };
}

const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** Checks an admin form submission and keeps only the columns it may set. */
export function parseKitchenDish(
  body: Record<string, unknown>,
): { row: Omit<KitchenDishRow, "id"> } | { error: string } {
  const meal = body.meal as Meal;
  // Cafe dishes are the cafe's own, whatever was sent.
  const kitchen = (body.meal === "cafe" ? "cafe" : body.kitchen) as Kitchen;
  const name = text(body.name);
  const price = Number(body.price);
  const hasKcal = body.kcal !== null && body.kcal !== "" && body.kcal !== undefined;
  const kcal = hasKcal ? Number(body.kcal) : null;
  const serves = Number(body.serves);
  const badge = body.badge ? (body.badge as DishBadge) : null;

  if (!Object.keys(MEAL_LABELS).includes(meal)) return { error: "Choose a meal." };
  if (meal !== "cafe" && !COOKING_KITCHENS.includes(kitchen)) return { error: "Choose Italian or Turkish." };
  if (!name) return { error: "Enter a name." };
  if (body.price === "" || body.price === null || !Number.isFinite(price) || price < 0) {
    return { error: "Enter a valid price." };
  }
  if (kcal !== null && (!Number.isInteger(kcal) || kcal < 0)) {
    return { error: "Calories must be a whole number." };
  }
  if (!Number.isInteger(serves) || serves < 1) return { error: "Serves must be 1 or more people." };
  if (badge && !Object.keys(BADGE_LABELS).includes(badge)) return { error: "Choose a valid badge." };

  return {
    row: {
      meal,
      kitchen,
      name,
      name_ar: text(body.name_ar),
      description: text(body.description),
      description_ar: text(body.description_ar),
      price,
      kcal,
      serves,
      image_url: text(body.image_url),
      badge,
      is_healthy: body.is_healthy === true,
      is_high_protein: body.is_high_protein === true,
      category_ids: Array.isArray(body.category_ids)
        ? Array.from(new Set(body.category_ids.filter((id): id is string => typeof id === "string" && UUID.test(id))))
        : [],
      sort_order: Number.isInteger(Number(body.sort_order)) ? Number(body.sort_order) : 0,
      is_active: body.is_active !== false,
    },
  };
}
