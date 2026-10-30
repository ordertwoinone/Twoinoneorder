export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { applyPayment } from "@/lib/kitchen-payments";
import { supabaseAdminLive } from "@/lib/supabase-admin";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const result = await applyPayment(supabaseAdminLive, params.id, await request.json().catch(() => ({})));
  return NextResponse.json(result.error ? { error: result.error } : { success: true }, { status: result.status });
}
