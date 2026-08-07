export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { insertRow } from "@/lib/admin-write";

export async function GET() {
  const { data, error } = await supabaseAdminLive
    .from("buffet_highlights")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { data, error } = await insertRow("buffet_highlights", body);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidatePath("/");
  return NextResponse.json(data, { status: 201 });
}
