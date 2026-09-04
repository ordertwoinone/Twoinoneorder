/**
 * The kiosk's own words, in both languages.
 *
 * Its own dictionary rather than the site's. The site's is loaded through a
 * React context that reads a cookie and localStorage, which is right for a
 * visitor who has a language and keeps it — and wrong for a screen that has to
 * forget the last customer's choice the moment they walk away. Here the
 * language is a piece of order state, cleared with the basket.
 *
 * Anything an admin typed — a dish, a category, an ad headline — is not in
 * here. Those carry their own `_ar` column and are picked per row.
 */

export type KioskLang = "en" | "ar";

export const KIOSK_LANGS: { code: KioskLang; label: string; dir: "ltr" | "rtl" }[] = [
  { code: "en", label: "English", dir: "ltr" },
  { code: "ar", label: "العربية", dir: "rtl" },
];

export function dirFor(lang: KioskLang): "ltr" | "rtl" {
  return lang === "ar" ? "rtl" : "ltr";
}

type Dict = Record<string, string>;

const EN: Dict = {
  // Steps
  "step.choose": "Choose",
  "step.review": "Review",
  "step.privilege": "Privilege Card",
  "step.phone": "Phone Number",
  "step.done": "Done",

  // Menu
  "menu.all": "All Items",
  "menu.allCategories": "All",
  "menu.popular": "Popular",
  "menu.cheap": "Under AED",
  "menu.veg": "Vegetarian",
  "menu.spicy": "Spicy",
  "menu.offers": "Offers",
  "menu.new": "New",
  "menu.empty": "Nothing here right now",
  "menu.emptyHint": "Try another category.",
  "menu.more": "More",
  "menu.addCombo": "Add Combo",
  "menu.save": "Save AED",
  "cart.title": "My Order",
  "cart.empty": "Nothing added yet",
  "cart.items": "items",
  "cart.item": "item",
  "cart.youSave": "You save",
  "cart.review": "Review Order",

  // Options sheet
  "options.required": "Required",
  "options.optional": "Optional",
  "options.upTo": "up to",
  "options.add": "Add to Order",
  "options.choose": "Choose",

  // Review
  "review.title": "Your Order",
  "review.checkOver": "check it over before you pay",
  "review.empty": "Nothing in your order yet.",
  "review.each": "each",
  "review.saved": "saved",
  "review.change": "Change",
  "review.subtotal": "Subtotal",
  "review.itemOffers": "Item offers",
  "review.privilegeDiscount": "Privilege discount",
  "review.total": "Total",
  "review.includesVat": "Includes",
  "review.vat": "VAT",
  "review.addMore": "Add More",
  "review.continue": "Continue",
  "review.placeOrder": "Place Order",
  "review.havePrivilege": "Have a Privilege Card?",
  "review.enterMember": "Enter your member number for your discount",
  "review.privilegeApplied": "Privilege Card applied",
  "review.addNote": "Add a note",
  "review.editNote": "Note",
  "review.off": "off",
  "review.remove": "Remove",

  // Privilege
  "privilege.title": "Privilege Card",
  "privilege.subtitle": "Enter the member number printed on your card",
  "privilege.hint": "Your member id, or the 16 digits on the front",
  "privilege.noCard": "No card",
  "privilege.apply": "Apply Card",
  "privilege.checking": "Checking…",

  // Phone
  "phone.title": "Enter Your Phone Number",
  "phone.subtitle": "We’ll send your order number and digital receipt by SMS.",
  "phone.pickup": "Pickup",
  "phone.delivery": "Delivery",
  "phone.smsReceipt": "Send receipt by SMS",
  "phone.whatsappReceipt": "Send receipt by WhatsApp",
  "phone.privacy": "Your number is used only for this order.",
  "phone.summary": "Final Order Summary",
  "phone.back": "Back",
  "phone.done": "DONE",
  "phone.sending": "Sending to the kitchen…",
  "phone.orderNote": "Anything else for the kitchen?",
  "phone.orderNoteHint": "Cutlery, allergies, where to call — anything for the whole order",
  "phone.orderNoteAdd": "Add a note",
  "phone.orderNoteEdit": "Change",

  // Notes
  "note.itemTitle": "Add a note",
  "note.orderTitle": "A note for the kitchen",
  "note.orderSubtitle": "For the whole order",
  "note.placeholder": "Type anything else here",
  "note.save": "Save note",
  "note.clear": "Remove note",
  "note.cancel": "Cancel",

  // Done
  "done.title": "Order Confirmed!",
  "done.subtitle": "Thank you — your order has been sent to the kitchen.",
  "done.orderId": "Your order id",
  "done.showAtCounter": "Please show this number at the pickup counter.",
  "done.quoteNumber": "Quote this number if you call about your order.",
  "done.scan": "Scan to track your order",
  "done.readyTime": "Estimated ready time",
  "done.min": "min",
  "done.pickup": "Pickup",
  "done.deliveringTo": "Delivering to",
  "done.willCall": "We will call you",
  "done.received": "Received",
  "done.preparing": "Preparing",
  "done.ready": "Ready",
  "done.onTheWay": "On the way",
  "done.payCounter": "Pay at the counter when you collect.",
  "done.payDelivery": "We will call you on the number you gave to arrange delivery.",
  "done.privilegeApplied": "Privilege discount applied",
  "done.receiptSent": "Receipt sent to",
  "done.print": "Print Receipt",
  "done.track": "Track Order",
  "done.newOrder": "Start New Order",
  "done.clearing": "Screen will clear automatically in",
  "done.seconds": "seconds",
  "done.second": "second",

  // Common
  "common.login": "Login",
  "badge.off": "OFF",
  "badge.bestSeller": "BEST SELLER",
  "badge.spicy": "SPICY",
  "badge.veg": "VEG",
};

const AR: Dict = {
  "step.choose": "اختر",
  "step.review": "المراجعة",
  "step.privilege": "بطاقة الامتيازات",
  "step.phone": "رقم الهاتف",
  "step.done": "تم",

  "menu.all": "كل الأصناف",
  "menu.allCategories": "الكل",
  "menu.popular": "الأكثر طلبًا",
  "menu.cheap": "أقل من",
  "menu.veg": "نباتي",
  "menu.spicy": "حار",
  "menu.offers": "عروض",
  "menu.new": "جديد",
  "menu.empty": "لا يوجد شيء هنا الآن",
  "menu.emptyHint": "جرّب قسمًا آخر.",
  "menu.more": "المزيد",
  "menu.addCombo": "أضف الوجبة",
  "menu.save": "وفّر",
  "cart.title": "طلبي",
  "cart.empty": "لم تتم إضافة شيء بعد",
  "cart.items": "أصناف",
  "cart.item": "صنف",
  "cart.youSave": "توفّر",
  "cart.review": "مراجعة الطلب",

  "options.required": "مطلوب",
  "options.optional": "اختياري",
  "options.upTo": "حتى",
  "options.add": "أضف إلى الطلب",
  "options.choose": "اختر",

  "review.title": "طلبك",
  "review.checkOver": "راجعه قبل الدفع",
  "review.empty": "لا يوجد شيء في طلبك بعد.",
  "review.each": "للواحدة",
  "review.saved": "وفّرت",
  "review.change": "تغيير",
  "review.subtotal": "المجموع الفرعي",
  "review.itemOffers": "خصومات الأصناف",
  "review.privilegeDiscount": "خصم بطاقة الامتيازات",
  "review.total": "الإجمالي",
  "review.includesVat": "يشمل",
  "review.vat": "ضريبة القيمة المضافة",
  "review.addMore": "أضف المزيد",
  "review.continue": "متابعة",
  "review.placeOrder": "إرسال الطلب",
  "review.havePrivilege": "هل لديك بطاقة امتيازات؟",
  "review.enterMember": "أدخل رقم العضوية للحصول على الخصم",
  "review.privilegeApplied": "تم تطبيق بطاقة الامتيازات",
  "review.addNote": "أضف ملاحظة",
  "review.editNote": "ملاحظة",
  "review.off": "خصم",
  "review.remove": "إزالة",

  "privilege.title": "بطاقة الامتيازات",
  "privilege.subtitle": "أدخل رقم العضوية المطبوع على بطاقتك",
  "privilege.hint": "رقم العضوية أو الأرقام الستة عشر على الوجه",
  "privilege.noCard": "لا أملك بطاقة",
  "privilege.apply": "تطبيق البطاقة",
  "privilege.checking": "جارٍ التحقق…",

  "phone.title": "أدخل رقم هاتفك",
  "phone.subtitle": "سنرسل لك رقم الطلب والإيصال الرقمي برسالة نصية.",
  "phone.pickup": "استلام",
  "phone.delivery": "توصيل",
  "phone.smsReceipt": "إرسال الإيصال برسالة نصية",
  "phone.whatsappReceipt": "إرسال الإيصال عبر واتساب",
  "phone.privacy": "يُستخدم رقمك لهذا الطلب فقط.",
  "phone.summary": "ملخص الطلب النهائي",
  "phone.back": "رجوع",
  "phone.done": "تم",
  "phone.sending": "جارٍ الإرسال إلى المطبخ…",
  "phone.orderNote": "هل من شيء آخر للمطبخ؟",
  "phone.orderNoteHint": "أدوات المائدة، الحساسية، وقت الاتصال — أي شيء يخص الطلب كاملاً",
  "phone.orderNoteAdd": "أضف ملاحظة",
  "phone.orderNoteEdit": "تعديل",

  // Notes
  "note.itemTitle": "أضف ملاحظة",
  "note.orderTitle": "ملاحظة للمطبخ",
  "note.orderSubtitle": "لكامل الطلب",
  "note.placeholder": "اكتب أي شيء آخر هنا",
  "note.save": "حفظ الملاحظة",
  "note.clear": "إزالة الملاحظة",
  "note.cancel": "إلغاء",

  "done.title": "تم تأكيد الطلب!",
  "done.subtitle": "شكرًا لك — تم إرسال طلبك إلى المطبخ.",
  "done.orderId": "رقم طلبك",
  "done.showAtCounter": "يرجى إظهار هذا الرقم عند نقطة الاستلام.",
  "done.quoteNumber": "اذكر هذا الرقم إذا اتصلت بخصوص طلبك.",
  "done.scan": "امسح لتتبع طلبك",
  "done.readyTime": "الوقت المتوقع للتجهيز",
  "done.min": "دقيقة",
  "done.pickup": "الاستلام",
  "done.deliveringTo": "التوصيل إلى",
  "done.willCall": "سنتصل بك",
  "done.received": "تم الاستلام",
  "done.preparing": "قيد التحضير",
  "done.ready": "جاهز",
  "done.onTheWay": "في الطريق",
  "done.payCounter": "ادفع عند الاستلام من الكاشير.",
  "done.payDelivery": "سنتصل بك على الرقم الذي أدخلته لترتيب التوصيل.",
  "done.privilegeApplied": "تم تطبيق خصم الامتيازات",
  "done.receiptSent": "أُرسل الإيصال إلى",
  "done.print": "طباعة الإيصال",
  "done.track": "تتبع الطلب",
  "done.newOrder": "طلب جديد",
  "done.clearing": "ستُمسح الشاشة تلقائيًا خلال",
  "done.seconds": "ثانية",
  "done.second": "ثانية",

  "common.login": "تسجيل الدخول",
  "badge.off": "خصم",
  "badge.bestSeller": "الأكثر مبيعًا",
  "badge.spicy": "حار",
  "badge.veg": "نباتي",
};

const DICTS: Record<KioskLang, Dict> = { en: EN, ar: AR };

/**
 * A translator for one language.
 *
 * Falls back to English rather than showing a key, because a missing Arabic
 * string should read as an untranslated screen, not a broken one.
 */
export function kioskT(lang: KioskLang) {
  return (key: string): string => DICTS[lang][key] ?? EN[key] ?? key;
}

/**
 * The Arabic value of a row's field when the screen is in Arabic, falling back
 * to what the admin typed in English.
 *
 * Same rule the rest of the site follows: a blank `_ar` is not a gap to be
 * filled with a key, it is a dish nobody has translated yet.
 */
export function kioskField<T extends object>(
  lang: KioskLang,
  row: T | null | undefined,
  field: Extract<keyof T, string>,
): string {
  if (!row) return "";
  const record = row as unknown as Record<string, string | null | undefined>;
  const english = record[field] ?? "";
  if (lang !== "ar") return english;
  return (record[`${field}_ar`] ?? "").trim() || english;
}
