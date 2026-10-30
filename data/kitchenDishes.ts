/**
 * Sample dishes for the /kitchens page, shown until admin → Kitchens has an
 * active dish. The names, prices and calories are placeholders, which the page
 * says out loud.
 */

import type { KalbaAddonGroup } from "@/lib/kalba/addons";

export type Meal = "breakfast" | "lunch" | "dinner";
export type Kitchen = "italian" | "turkish";
export type DishBadge = "pizza" | "bbq" | "fresh" | "morning";

export interface KitchenDish {
  id: string;
  meal: Meal;
  kitchen: Kitchen;
  name: string;
  name_ar: string;
  description: string;
  description_ar: string;
  price: number;
  kcal: number | null;
  /** How many people it feeds. */
  serves: number;
  image: string;
  /** Pinned to the corner of the photo. */
  badge?: DishBadge;
  healthy?: boolean;
  highProtein?: boolean;
}

const photo = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=600&h=420&fit=crop&q=70&auto=format`;

export const kitchenDishes: KitchenDish[] = [
  // Breakfast
  {
    id: "b-bruschetta", meal: "breakfast", kitchen: "italian",
    name: "Tomato Bruschetta", name_ar: "بروسكيتا الطماطم",
    description: "Toasted bread, ripe tomato & fresh herbs.",
    description_ar: "خبز محمّص مع طماطم ناضجة وأعشاب طازجة.",
    price: 24, kcal: 310, serves: 2, image: photo("1572695157366-5e585ab2b69f"), badge: "morning", healthy: true,
  },
  {
    id: "b-plate", meal: "breakfast", kitchen: "turkish",
    name: "Turkish Breakfast Plate", name_ar: "طبق الفطور التركي",
    description: "Fried egg, grilled tomato & toasted bread.",
    description_ar: "بيض مقلي مع طماطم مشوية وخبز محمّص.",
    price: 32, kcal: 540, serves: 1, image: photo("1533089860892-a7c6f0a88666"),
  },
  {
    id: "b-brioche", meal: "breakfast", kitchen: "italian",
    name: "Sweet Brioche Toast", name_ar: "توست بريوش حلو",
    description: "Golden brioche, banana & blueberries.",
    description_ar: "بريوش ذهبي مع موز وتوت أزرق.",
    price: 28, kcal: 610, serves: 1, image: photo("1484723091739-30a097e8f929"),
  },
  {
    id: "b-avocado", meal: "breakfast", kitchen: "turkish",
    name: "Egg & Avocado Toast", name_ar: "توست البيض والأفوكادو",
    description: "Sourdough, smashed avocado & a fried egg.",
    description_ar: "خبز العجين المخمّر مع أفوكادو مهروس وبيضة مقلية.",
    price: 30, kcal: 390, serves: 1, image: photo("1525351484163-7529414344d8"), healthy: true, highProtein: true,
  },

  // Lunch
  {
    id: "l-margherita", meal: "lunch", kitchen: "italian",
    name: "Margherita Slices", name_ar: "شرائح مارغريتا",
    description: "Thin crust, tomato sauce & mozzarella.",
    description_ar: "عجينة رقيقة مع صلصة الطماطم والموزاريلا.",
    price: 29, kcal: 640, serves: 2, image: photo("1590947132387-155cc02f3212"), badge: "pizza",
  },
  {
    id: "l-kofte", meal: "lunch", kitchen: "turkish",
    name: "Köfte & Greens", name_ar: "كفتة مع الخضار",
    description: "Spiced meatballs on a bed of rocket.",
    description_ar: "كرات لحم متبّلة على طبقة من الجرجير.",
    price: 38, kcal: 470, serves: 1, image: photo("1529042410759-befb1204b468"), healthy: true, highProtein: true,
  },
  {
    id: "l-penne", meal: "lunch", kitchen: "italian",
    name: "Penne Arrabbiata", name_ar: "بيني أرابياتا",
    description: "Penne in a warm, spicy tomato sauce.",
    description_ar: "مكرونة بيني بصلصة طماطم حارة.",
    price: 33, kcal: 580, serves: 1, image: photo("1621996346565-e3dbc646d9a9"),
  },
  {
    id: "l-bowl", meal: "lunch", kitchen: "turkish",
    name: "Grilled Chicken Bowl", name_ar: "وعاء الدجاج المشوي",
    description: "Chargrilled chicken, egg & crunchy salad.",
    description_ar: "دجاج مشوي مع بيض وسلطة مقرمشة.",
    price: 36, kcal: 430, serves: 1, image: photo("1546069901-ba9599a7e63c"), badge: "fresh", healthy: true, highProtein: true,
  },

  // Dinner
  {
    id: "d-pizza", meal: "dinner", kitchen: "italian",
    name: "Classic Italian Pizza", name_ar: "بيتزا إيطالية كلاسيكية",
    description: "Stone-baked pizza, melted cheese & basil.",
    description_ar: "بيتزا مخبوزة على الحجر مع جبن ذائب وريحان.",
    price: 36, kcal: 820, serves: 2, image: photo("1513104890138-7c749659a591"), badge: "pizza",
  },
  {
    id: "d-grill", meal: "dinner", kitchen: "turkish",
    name: "Mixed Turkish Grill", name_ar: "مشاوي تركية مشكّلة",
    description: "A generous grill selection with house sides.",
    description_ar: "تشكيلة وفيرة من المشاوي مع أطباق جانبية.",
    price: 59, kcal: 680, serves: 4, image: photo("1555939594-58d7cb561ad1"), badge: "bbq",
  },
  {
    id: "d-pasta", meal: "dinner", kitchen: "italian",
    name: "Basil Pasta", name_ar: "باستا بالريحان",
    description: "Fresh basil sauce & a parmesan finish.",
    description_ar: "صلصة ريحان طازجة مع لمسة من البارميزان.",
    price: 35, kcal: 560, serves: 1, image: photo("1551183053-bf91a1d81141"),
  },
  {
    id: "d-shish", meal: "dinner", kitchen: "turkish",
    name: "Chicken Shish Dinner", name_ar: "عشاء شيش الدجاج",
    description: "Chargrilled chicken with rice & salad.",
    description_ar: "دجاج مشوي على الفحم مع أرز وسلطة.",
    price: 42, kcal: 420, serves: 1, image: photo("1603360946369-dc9bb6258143"), healthy: true, highProtein: true,
  },
];

const sampleOption = (itemId: string, id: string, name: string, name_ar: string, price: number, photoId: string) => ({
  id, item_id: itemId, name, name_ar, price, image_url: photo(photoId),
});

const SALAD = "1512621776951-a57141f2eefd";
const BRUSCHETTA = "1572695157366-5e585ab2b69f";
const CHICKEN_BOWL = "1546069901-ba9599a7e63c";

/** Sample add-ons for two dishes: one optional group and one required. */
export const sampleAddonGroups: Record<string, KalbaAddonGroup[]> = {
  "d-pizza": [{
    id: "s-pizza-extras", item_id: "d-pizza",
    name: "Add something extra", name_ar: "أضف شيئًا إضافيًا",
    min_select: 0, max_select: 0,
    options: [
      sampleOption("d-pizza", "s-p-salad", "Side Salad", "سلطة جانبية", 12, SALAD),
      sampleOption("d-pizza", "s-p-bruschetta", "Bruschetta", "بروسكيتا", 10, BRUSCHETTA),
    ],
  }],
  "d-shish": [{
    id: "s-shish-side", item_id: "d-shish",
    name: "Choose a side", name_ar: "اختر طبقًا جانبيًا",
    min_select: 1, max_select: 1,
    options: [
      sampleOption("d-shish", "s-s-salad", "Garden Salad", "سلطة الحديقة", 0, SALAD),
      sampleOption("d-shish", "s-s-bowl", "Protein Bowl", "وعاء البروتين", 8, CHICKEN_BOWL),
    ],
  }],
};
