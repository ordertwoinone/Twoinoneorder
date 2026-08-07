export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { insertRow } from "@/lib/admin-write";

export async function GET() {
  const { data, error } = await supabaseAdminLive
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

  const { data: existing } = await supabaseAdminLive
    .from("campus_promo")
    .select("id")
    .limit(1)
    .single();

  let result;
  if (existing?.id) {
    result = await supabaseAdminLive
      .from("campus_promo")
      .update(body)
      .eq("id", existing.id)
      .select()
      .single();
  } else {
    result = await insertRow("campus_promo", body);
  }

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  revalidatePath("/");
  return NextResponse.json(result.data);
}
