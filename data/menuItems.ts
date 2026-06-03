export interface MenuItem {
  id: string;
  name: string;
  restaurantId: string;
  restaurantName: string;
  restaurantUrl: string;
  category: string;
  price?: number;
  currency?: string;
  tags?: string[];
}

export const menuItems: MenuItem[] = [
  // Two In One
  { id: "tio-1", name: "Karak Chai", restaurantId: "two-in-one", restaurantName: "Two In One", restaurantUrl: "https://order.twoinoneae.com", category: "Beverages", price: 5, currency: "AED", tags: ["tea", "hot", "spiced"] },
  { id: "tio-2", name: "Saffron Karak", restaurantId: "two-in-one", restaurantName: "Two In One", restaurantUrl: "https://order.twoinoneae.com", category: "Beverages", price: 7, currency: "AED", tags: ["saffron", "premium", "hot"] },
  { id: "tio-3", name: "Iced Karak", restaurantId: "two-in-one", restaurantName: "Two In One", restaurantUrl: "https://order.twoinoneae.com", category: "Beverages", price: 8, currency: "AED", tags: ["iced", "cold", "tea"] },
  { id: "tio-4", name: "Samosa", restaurantId: "two-in-one", restaurantName: "Two In One", restaurantUrl: "https://order.twoinoneae.com", category: "Snacks", price: 3, currency: "AED", tags: ["fried", "snack", "crispy"] },
  { id: "tio-5", name: "Cheese Sandwich", restaurantId: "two-in-one", restaurantName: "Two In One", restaurantUrl: "https://order.twoinoneae.com", category: "Sandwiches", price: 12, currency: "AED", tags: ["cheese", "bread", "hot"] },
  { id: "tio-6", name: "Egg Sandwich", restaurantId: "two-in-one", restaurantName: "Two In One", restaurantUrl: "https://order.twoinoneae.com", category: "Sandwiches", price: 10, currency: "AED", tags: ["egg", "bread"] },
  { id: "tio-7", name: "Date Cake", restaurantId: "two-in-one", restaurantName: "Two In One", restaurantUrl: "https://order.twoinoneae.com", category: "Desserts", price: 15, currency: "AED", tags: ["date", "cake", "sweet"] },
  { id: "tio-8", name: "Mint Lemonade", restaurantId: "two-in-one", restaurantName: "Two In One", restaurantUrl: "https://order.twoinoneae.com", category: "Beverages", price: 10, currency: "AED", tags: ["mint", "lemon", "cold", "fresh"] },

  // Karak & Snack
  { id: "ks-1", name: "Special Karak", restaurantId: "karak-snack", restaurantName: "Karak & Snack", restaurantUrl: "https://www.karaksnack.com", category: "Beverages", price: 6, currency: "AED", tags: ["karak", "special", "tea"] },
  { id: "ks-2", name: "Masala Chai", restaurantId: "karak-snack", restaurantName: "Karak & Snack", restaurantUrl: "https://www.karaksnack.com", category: "Beverages", price: 5, currency: "AED", tags: ["masala", "spiced", "indian"] },
  { id: "ks-3", name: "Vada Pav", restaurantId: "karak-snack", restaurantName: "Karak & Snack", restaurantUrl: "https://www.karaksnack.com", category: "Snacks", price: 10, currency: "AED", tags: ["indian", "street", "vada", "potato"] },
  { id: "ks-4", name: "Pav Bhaji", restaurantId: "karak-snack", restaurantName: "Karak & Snack", restaurantUrl: "https://www.karaksnack.com", category: "Mains", price: 18, currency: "AED", tags: ["indian", "bhaji", "street"] },
  { id: "ks-5", name: "Bhel Puri", restaurantId: "karak-snack", restaurantName: "Karak & Snack", restaurantUrl: "https://www.karaksnack.com", category: "Snacks", price: 12, currency: "AED", tags: ["puri", "crispy", "chat"] },
  { id: "ks-6", name: "Aloo Tikki", restaurantId: "karak-snack", restaurantName: "Karak & Snack", restaurantUrl: "https://www.karaksnack.com", category: "Snacks", price: 9, currency: "AED", tags: ["potato", "tikki", "fried"] },
  { id: "ks-7", name: "Cold Coffee", restaurantId: "karak-snack", restaurantName: "Karak & Snack", restaurantUrl: "https://www.karaksnack.com", category: "Beverages", price: 15, currency: "AED", tags: ["coffee", "cold", "iced"] },
  { id: "ks-8", name: "Mango Lassi", restaurantId: "karak-snack", restaurantName: "Karak & Snack", restaurantUrl: "https://www.karaksnack.com", category: "Beverages", price: 14, currency: "AED", tags: ["mango", "lassi", "yogurt", "cold"] },

  // Falafel Al Nile
  { id: "fan-1", name: "Falafel Wrap", restaurantId: "falafel-al-nile", restaurantName: "Falafel Al Nile", restaurantUrl: "https://order.falafelalnile.com", category: "Wraps", price: 15, currency: "AED", tags: ["falafel", "wrap", "vegan"] },
  { id: "fan-2", name: "Falafel Plate", restaurantId: "falafel-al-nile", restaurantName: "Falafel Al Nile", restaurantUrl: "https://order.falafelalnile.com", category: "Mains", price: 22, currency: "AED", tags: ["falafel", "plate", "hummus"] },
  { id: "fan-3", name: "Shawarma Chicken", restaurantId: "falafel-al-nile", restaurantName: "Falafel Al Nile", restaurantUrl: "https://order.falafelalnile.com", category: "Wraps", price: 18, currency: "AED", tags: ["shawarma", "chicken", "wrap"] },
  { id: "fan-4", name: "Shawarma Meat", restaurantId: "falafel-al-nile", restaurantName: "Falafel Al Nile", restaurantUrl: "https://order.falafelalnile.com", category: "Wraps", price: 20, currency: "AED", tags: ["shawarma", "meat", "beef"] },
  { id: "fan-5", name: "Hummus", restaurantId: "falafel-al-nile", restaurantName: "Falafel Al Nile", restaurantUrl: "https://order.falafelalnile.com", category: "Sides", price: 12, currency: "AED", tags: ["hummus", "dip", "chickpea"] },
  { id: "fan-6", name: "Ful Medames", restaurantId: "falafel-al-nile", restaurantName: "Falafel Al Nile", restaurantUrl: "https://order.falafelalnile.com", category: "Mains", price: 14, currency: "AED", tags: ["ful", "beans", "egyptian"] },
  { id: "fan-7", name: "Kushari", restaurantId: "falafel-al-nile", restaurantName: "Falafel Al Nile", restaurantUrl: "https://order.falafelalnile.com", category: "Mains", price: 20, currency: "AED", tags: ["kushari", "rice", "egyptian"] },
  { id: "fan-8", name: "Tahini Salad", restaurantId: "falafel-al-nile", restaurantName: "Falafel Al Nile", restaurantUrl: "https://order.falafelalnile.com", category: "Salads", price: 15, currency: "AED", tags: ["tahini", "salad", "fresh"] },

  // Mini Box
  { id: "mb-1", name: "Mini Croissant", restaurantId: "mini-box", restaurantName: "Mini Box", restaurantUrl: "https://www.miniboxae.com", category: "Bakery", price: 8, currency: "AED", tags: ["croissant", "pastry", "buttery"] },
  { id: "mb-2", name: "Cheese Croissant", restaurantId: "mini-box", restaurantName: "Mini Box", restaurantUrl: "https://www.miniboxae.com", category: "Bakery", price: 12, currency: "AED", tags: ["cheese", "croissant", "pastry"] },
  { id: "mb-3", name: "Club Sandwich", restaurantId: "mini-box", restaurantName: "Mini Box", restaurantUrl: "https://www.miniboxae.com", category: "Sandwiches", price: 25, currency: "AED", tags: ["club", "sandwich", "chicken"] },
  { id: "mb-4", name: "Tuna Sandwich", restaurantId: "mini-box", restaurantName: "Mini Box", restaurantUrl: "https://www.miniboxae.com", category: "Sandwiches", price: 20, currency: "AED", tags: ["tuna", "sandwich"] },
  { id: "mb-5", name: "Cinnamon Roll", restaurantId: "mini-box", restaurantName: "Mini Box", restaurantUrl: "https://www.miniboxae.com", category: "Desserts", price: 15, currency: "AED", tags: ["cinnamon", "roll", "sweet", "pastry"] },
  { id: "mb-6", name: "Chocolate Muffin", restaurantId: "mini-box", restaurantName: "Mini Box", restaurantUrl: "https://www.miniboxae.com", category: "Desserts", price: 12, currency: "AED", tags: ["chocolate", "muffin", "sweet"] },
  { id: "mb-7", name: "Breakfast Box", restaurantId: "mini-box", restaurantName: "Mini Box", restaurantUrl: "https://www.miniboxae.com", category: "Combos", price: 35, currency: "AED", tags: ["breakfast", "box", "combo", "eggs"] },
  { id: "mb-8", name: "Mini Pizza", restaurantId: "mini-box", restaurantName: "Mini Box", restaurantUrl: "https://www.miniboxae.com", category: "Mains", price: 18, currency: "AED", tags: ["pizza", "mini", "cheese"] },
];
