export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { updateRow } from "@/lib/admin-write";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json();
  const { data, error } = await updateRow("kalba_coupons", params.id, body);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { error } = await supabaseAdminLive
    .from("kalba_coupons")
    .delete()
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
