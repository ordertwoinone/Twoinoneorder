export interface Restaurant {
  id: string;
  name: string;
  nameAr?: string;
  logo: string;
  foodImage: string;
  cuisine: string[];
  rating: number;
  deliveryTime: string;
  badge?: "Free Delivery" | "Best Seller" | "Popular" | "New";
  url: string;
  description: string;
  color: string;
}

export const restaurants: Restaurant[] = [
  {
    id: "two-in-one",
    name: "Two In One",
    logo: "/logos/two-in-one.png",
    foodImage: "https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=600&q=80",
    cuisine: ["Karak", "Beverages", "Snacks"],
    rating: 4.8,
    deliveryTime: "25–35 min",
    badge: "Best Seller",
    url: "https://order.twoinoneae.com",
    description: "Authentic karak chai & gourmet snacks",
    color: "#16a34a",
  },
  {
    id: "karak-snack",
    name: "Karak & Snack",
    logo: "/logos/karak-snack.png",
    foodImage: "https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=600&q=80",
    cuisine: ["Karak", "Indian Snacks", "Street Food"],
    rating: 4.9,
    deliveryTime: "15–25 min",
    badge: "Popular",
    url: "https://www.karaksnack.com",
    description: "Spiced karak tea & crispy street snacks",
    color: "#dc2626",
  },
  {
    id: "falafel-al-nile",
    name: "Falafel Al Nile",
    nameAr: "فلافل النيل",
    logo: "/logos/falafel-al-nile.png",
    foodImage: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&q=80",
    cuisine: ["Egyptian", "Falafel", "Shawarma"],
    rating: 4.8,
    deliveryTime: "20–30 min",
    badge: "Free Delivery",
    url: "https://order.falafelalnile.com",
    description: "Authentic Egyptian falafel & wraps",
    color: "#ea580c",
  },
  {
    id: "mini-box",
    name: "Mini Box",
    nameAr: "ميني بوكس",
    logo: "/logos/mini-box.png",
    foodImage: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=80",
    cuisine: ["Bakery", "Sandwiches", "Pastries"],
    rating: 4.6,
    deliveryTime: "20–30 min",
    badge: "Free Delivery",
    url: "https://www.miniboxae.com",
    description: "Fresh-baked sandwiches & pastries",
    color: "#f59e0b",
  },
];
