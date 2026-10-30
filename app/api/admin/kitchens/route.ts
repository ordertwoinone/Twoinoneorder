export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { insertRow } from "@/lib/admin-write";
import { parseKitchenDish } from "@/lib/kitchens";

export async function GET() {
  const { data, error } = await supabaseAdminLive
    .from("kitchen_dishes")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const parsed = parseKitchenDish(await request.json());
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { data, error } = await insertRow("kitchen_dishes", parsed.row);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidatePath("/kitchens");
  return NextResponse.json(data, { status: 201 });
}
