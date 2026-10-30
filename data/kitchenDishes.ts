/**
 * Sample dishes for the /kitchens page. Nothing here is on the live menu: the
 * names, prices and calories are placeholders, which the page says out loud.
 */

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
  kcal: number;
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
    price: 24, kcal: 310, image: photo("1572695157366-5e585ab2b69f"), badge: "morning", healthy: true,
  },
  {
    id: "b-plate", meal: "breakfast", kitchen: "turkish",
    name: "Turkish Breakfast Plate", name_ar: "طبق الفطور التركي",
    description: "Fried egg, grilled tomato & toasted bread.",
    description_ar: "بيض مقلي مع طماطم مشوية وخبز محمّص.",
    price: 32, kcal: 540, image: photo("1533089860892-a7c6f0a88666"),
  },
  {
    id: "b-brioche", meal: "breakfast", kitchen: "italian",
    name: "Sweet Brioche Toast", name_ar: "توست بريوش حلو",
    description: "Golden brioche, banana & blueberries.",
    description_ar: "بريوش ذهبي مع موز وتوت أزرق.",
    price: 28, kcal: 610, image: photo("1484723091739-30a097e8f929"),
  },
  {
    id: "b-avocado", meal: "breakfast", kitchen: "turkish",
    name: "Egg & Avocado Toast", name_ar: "توست البيض والأفوكادو",
    description: "Sourdough, smashed avocado & a fried egg.",
    description_ar: "خبز العجين المخمّر مع أفوكادو مهروس وبيضة مقلية.",
    price: 30, kcal: 390, image: photo("1525351484163-7529414344d8"), healthy: true, highProtein: true,
  },

  // Lunch
  {
    id: "l-margherita", meal: "lunch", kitchen: "italian",
    name: "Margherita Slices", name_ar: "شرائح مارغريتا",
    description: "Thin crust, tomato sauce & mozzarella.",
    description_ar: "عجينة رقيقة مع صلصة الطماطم والموزاريلا.",
    price: 29, kcal: 640, image: photo("1590947132387-155cc02f3212"), badge: "pizza",
  },
  {
    id: "l-kofte", meal: "lunch", kitchen: "turkish",
    name: "Köfte & Greens", name_ar: "كفتة مع الخضار",
    description: "Spiced meatballs on a bed of rocket.",
    description_ar: "كرات لحم متبّلة على طبقة من الجرجير.",
    price: 38, kcal: 470, image: photo("1529042410759-befb1204b468"), healthy: true, highProtein: true,
  },
  {
    id: "l-penne", meal: "lunch", kitchen: "italian",
    name: "Penne Arrabbiata", name_ar: "بيني أرابياتا",
    description: "Penne in a warm, spicy tomato sauce.",
    description_ar: "مكرونة بيني بصلصة طماطم حارة.",
    price: 33, kcal: 580, image: photo("1621996346565-e3dbc646d9a9"),
  },
  {
    id: "l-bowl", meal: "lunch", kitchen: "turkish",
    name: "Grilled Chicken Bowl", name_ar: "وعاء الدجاج المشوي",
    description: "Chargrilled chicken, egg & crunchy salad.",
    description_ar: "دجاج مشوي مع بيض وسلطة مقرمشة.",
    price: 36, kcal: 430, image: photo("1546069901-ba9599a7e63c"), badge: "fresh", healthy: true, highProtein: true,
  },

  // Dinner
  {
    id: "d-pizza", meal: "dinner", kitchen: "italian",
    name: "Classic Italian Pizza", name_ar: "بيتزا إيطالية كلاسيكية",
    description: "Stone-baked pizza, melted cheese & basil.",
    description_ar: "بيتزا مخبوزة على الحجر مع جبن ذائب وريحان.",
    price: 36, kcal: 820, image: photo("1513104890138-7c749659a591"), badge: "pizza",
  },
  {
    id: "d-grill", meal: "dinner", kitchen: "turkish",
    name: "Mixed Turkish Grill", name_ar: "مشاوي تركية مشكّلة",
    description: "A generous grill selection with house sides.",
    description_ar: "تشكيلة وفيرة من المشاوي مع أطباق جانبية.",
    price: 59, kcal: 680, image: photo("1555939594-58d7cb561ad1"), badge: "bbq",
  },
  {
    id: "d-pasta", meal: "dinner", kitchen: "italian",
    name: "Basil Pasta", name_ar: "باستا بالريحان",
    description: "Fresh basil sauce & a parmesan finish.",
    description_ar: "صلصة ريحان طازجة مع لمسة من البارميزان.",
    price: 35, kcal: 560, image: photo("1551183053-bf91a1d81141"),
  },
  {
    id: "d-shish", meal: "dinner", kitchen: "turkish",
    name: "Chicken Shish Dinner", name_ar: "عشاء شيش الدجاج",
    description: "Chargrilled chicken with rice & salad.",
    description_ar: "دجاج مشوي على الفحم مع أرز وسلطة.",
    price: 42, kcal: 420, image: photo("1603360946369-dc9bb6258143"), healthy: true, highProtein: true,
  },
];
