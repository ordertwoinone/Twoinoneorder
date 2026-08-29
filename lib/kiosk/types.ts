/**
 * The self-order kiosk: what a screen is given, and what it sends back.
 *
 * The kiosk sells the University Kalba menu rather than a menu of its own, so
 * the item and category shapes here are the Kalba ones. Only the screen's own
 * settings and its idle-screen ads are new.
 */

import type { KalbaCategory, KalbaPopularItem } from "@/app/restaurant/university-kalba/KalbaContent";

export type KioskCategory = KalbaCategory;

/**
 * A Kalba dish as the kiosk reads it.
 *
 * The two extra fields are columns the Kalba pages never needed but the kiosk
 * uses to sort the grid: the top-picks flag becomes the "Popular" filter and
 * the BEST SELLER flash, and created_at is what makes a dish count as new.
 */
export type KioskItem = KalbaPopularItem & {
  show_in_top_picks?: boolean | null;
  top_picks_order?: number | null;
  created_at?: string | null;
};

export interface KioskAd {
  id: string;
  media_type: "video" | "image";
  media_url: string;
  poster_url: string;
  headline: string;
  headline_ar?: string | null;
  subline: string;
  subline_ar?: string | null;
  /** 0 = a video runs its own length, an image holds for AD_FALLBACK_SECONDS. */
  duration_seconds: number;
  sort_order: number;
  is_active: boolean;
}

export interface KioskSettings {
  brand_name: string;
  brand_subtitle: string;
  logo_url: string;
  order_button_text: string;
  order_button_text_ar?: string | null;
  touch_hint: string;
  touch_hint_ar?: string | null;
  privilege_strip: string;
  privilege_strip_ar?: string | null;
  combo_enabled: boolean;
  combo_title: string;
  combo_title_ar?: string | null;
  combo_subtitle: string;
  combo_subtitle_ar?: string | null;
  combo_price: number | string;
  combo_save: number | string;
  combo_image_url: string;
  combo_item_ids: string[];
  ready_minutes_min: number;
  ready_minutes_max: number;
  pickup_counter: string;
  pickup_counter_ar?: string | null;
  order_prefix: string;
  reset_seconds: number;
  idle_timeout_seconds: number;
  privilege_enabled: boolean;
  phone_enabled: boolean;
  sms_receipt_enabled: boolean;
  whatsapp_receipt_enabled: boolean;
  is_live: boolean;
  closed_message: string;
  closed_message_ar?: string | null;
}

/** Everything one screen needs, in the one payload /api/kiosk/menu answers. */
export interface KioskData {
  settings: KioskSettings;
  ads: KioskAd[];
  categories: KioskCategory[];
  items: KioskItem[];
}

/** An image slide, or a video whose length we were not told, holds this long. */
export const AD_FALLBACK_SECONDS = 8;

export const DEFAULT_KIOSK_SETTINGS: KioskSettings = {
  brand_name: "TWO IN ONE",
  brand_subtitle: "UNIVERSITY KALBA",
  logo_url: "",
  order_button_text: "ORDER NOW",
  touch_hint: "Touch to begin",
  privilege_strip: "Privilege Card Members Get 10% OFF",
  combo_enabled: false,
  combo_title: "Campus Combo",
  combo_subtitle: "Burger + Fries + Drink",
  combo_price: 19,
  combo_save: 6,
  combo_image_url: "",
  combo_item_ids: [],
  ready_minutes_min: 12,
  ready_minutes_max: 15,
  pickup_counter: "University Kalba Counter",
  order_prefix: "TIO",
  reset_seconds: 30,
  idle_timeout_seconds: 90,
  privilege_enabled: true,
  phone_enabled: true,
  sms_receipt_enabled: true,
  whatsapp_receipt_enabled: true,
  is_live: true,
  closed_message: "The kiosk is closed right now. Please order at the counter.",
};

/** "TIO-1048" — what the customer reads out at the counter. */
export function kioskOrderCode(prefix: string, orderNumber: number | null | undefined): string {
  const clean = (prefix || "TIO").trim().toUpperCase();
  return orderNumber ? `${clean}-${orderNumber}` : clean;
}
