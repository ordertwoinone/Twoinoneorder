export interface Offer {
  id: string;
  title: string;
  subtitle: string;
  discount: string;
  emoji: string;
  restaurantId: string;
  restaurantName: string;
  url: string;
  bgFrom: string;
  bgTo: string;
  textColor: string;
  badge?: string;
}

export const offers: Offer[] = [
  {
    id: "offer-1",
    title: "Free Delivery",
    subtitle: "On all Falafel Al Nile orders",
    discount: "Save AED 5",
    emoji: "🧆",
    restaurantId: "falafel-al-nile",
    restaurantName: "Falafel Al Nile",
    url: "https://order.falafelalnile.com",
    bgFrom: "#ff6b00",
    bgTo: "#e67e22",
    textColor: "white",
    badge: "Limited",
  },
  {
    id: "offer-2",
    title: "Mini Box Deal",
    subtitle: "Buy 2 croissants, get 1 free",
    discount: "Buy 2 Get 1",
    emoji: "🥐",
    restaurantId: "mini-box",
    restaurantName: "Mini Box",
    url: "https://www.miniboxae.com",
    bgFrom: "#f5a623",
    bgTo: "#f39c12",
    textColor: "white",
    badge: "Hot Deal",
  },
  {
    id: "offer-3",
    title: "Karak Combo",
    subtitle: "Karak + Samosa for one price",
    discount: "AED 12 only",
    emoji: "☕",
    restaurantId: "karak-snack",
    restaurantName: "Karak & Snack",
    url: "https://www.karaksnack.com",
    bgFrom: "#c0392b",
    bgTo: "#e74c3c",
    textColor: "white",
  },
  {
    id: "offer-4",
    title: "Two In One Special",
    subtitle: "Iced Karak + Cheese Sandwich",
    discount: "20% OFF",
    emoji: "🧋",
    restaurantId: "two-in-one",
    restaurantName: "Two In One",
    url: "https://order.twoinoneae.com",
    bgFrom: "#1a1a1a",
    bgTo: "#333333",
    textColor: "white",
    badge: "Today Only",
  },
];
