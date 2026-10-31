export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { insertRow } from "@/lib/admin-write";
import { clashMessage, parseKitchenTable } from "@/lib/kitchen-tables";
import { supabaseAdminLive } from "@/lib/supabase-admin";

export async function GET() {
  const { data, error } = await supabaseAdminLive
    .from("kitchen_tables")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const parsed = parseKitchenTable(await request.json().catch(() => ({})));
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { data, error } = await insertRow("kitchen_tables", { ...parsed.row });
  if ((error as { code?: string } | null)?.code === "23505") return NextResponse.json({ error: clashMessage(parsed.row.code) }, { status: 409 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath("/kitchens");
  return NextResponse.json(data, { status: 201 });
}
