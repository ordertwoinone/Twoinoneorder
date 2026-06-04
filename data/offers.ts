export interface Offer {
  id: string;
  tag: string;
  title: string;
  subtitle: string;
  discount: string;
  ctaLabel: string;
  btnColor: string;
  darkBg: string;
  image: string;
  url: string;
  badge?: string;
}

export const offers: Offer[] = [
  {
    id: "offer-1",
    tag: "Today's Special!",
    title: "Free Delivery",
    subtitle: "On all Falafel Al Nile orders above AED 20.",
    discount: "Save AED 5",
    ctaLabel: "Order Now",
    btnColor: "#ea580c",
    darkBg: "#160900",
    image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&q=80",
    url: "https://order.falafelalnile.com",
    badge: "Limited",
  },
  {
    id: "offer-2",
    tag: "Hot Deal!",
    title: "Mini Box Deal",
    subtitle: "Buy 2 croissants & get 1 free today only.",
    discount: "Buy 2 Get 1",
    ctaLabel: "Grab Now",
    btnColor: "#d97706",
    darkBg: "#140d00",
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=80",
    url: "https://www.miniboxae.com",
    badge: "Hot Deal",
  },
  {
    id: "offer-3",
    tag: "Combo Offer!",
    title: "Karak Combo",
    subtitle: "Karak + Samosa for one unbeatable price.",
    discount: "AED 12 Only",
    ctaLabel: "Order Now",
    btnColor: "#dc2626",
    darkBg: "#110004",
    image: "https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=600&q=80",
    url: "https://www.karaksnack.com",
  },
  {
    id: "offer-4",
    tag: "Today Only!",
    title: "Two In One Special",
    subtitle: "Iced Karak + Cheese Sandwich at a special price.",
    discount: "20% OFF",
    ctaLabel: "Order Now",
    btnColor: "#16a34a",
    darkBg: "#001208",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80",
    url: "https://order.twoinoneae.com",
    badge: "Today Only",
  },
];
