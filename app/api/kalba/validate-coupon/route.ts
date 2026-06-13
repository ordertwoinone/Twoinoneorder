export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  const { code, cartTotal } = await request.json();

  if (!code) return NextResponse.json({ valid: false, error: "Please enter a coupon code" });

  const { data, error } = await supabaseAdmin
    .from("kalba_coupons")
    .select("id, code, description, discount_type, discount_value, min_order_amount, applicable_item_ids, is_active, expires_at")
    .eq("code", String(code).toUpperCase().trim())
    .eq("is_active", true)
    .single();

  if (error || !data) return NextResponse.json({ valid: false, error: "Invalid coupon code" });

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ valid: false, error: "This coupon has expired" });
  }

  if (data.min_order_amount && Number(cartTotal) < Number(data.min_order_amount)) {
    return NextResponse.json({
      valid: false,
      error: `Minimum order of AED ${data.min_order_amount} required`,
    });
  }

  return NextResponse.json({
    valid: true,
    coupon: {
      id: data.id,
      code: data.code,
      description: data.description,
      discount_type: data.discount_type as "percentage" | "fixed",
      discount_value: Number(data.discount_value),
      applicable_item_ids: data.applicable_item_ids ?? [],
    },
  });
}
