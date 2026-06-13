export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("campus_promo")
    .select("*")
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? null);
}

export async function PUT(request: Request) {
  const body = await request.json();

  const { data: existing } = await supabaseAdmin
    .from("campus_promo")
    .select("id")
    .limit(1)
    .single();

  let result;
  if (existing?.id) {
    result = await supabaseAdmin
      .from("campus_promo")
      .update(body)
      .eq("id", existing.id)
      .select()
      .single();
  } else {
    result = await supabaseAdmin
      .from("campus_promo")
      .insert([body])
      .select()
      .single();
  }

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  revalidatePath("/");
  return NextResponse.json(result.data);
}
