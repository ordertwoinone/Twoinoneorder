export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function POST() {
  revalidatePath("/", "layout");
  revalidatePath("/");
  return NextResponse.json({ success: true, revalidated_at: new Date().toISOString() });
}

