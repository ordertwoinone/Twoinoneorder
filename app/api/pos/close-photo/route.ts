export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { currentStaff } from "@/lib/pos/auth";

/**
 * Storing the day-close photograph.
 *
 * Its own endpoint rather than part of the close payload: a JPEG is a hundred
 * times the size of the rest of the request, and a network hiccup uploading it
 * must not lose a reconciliation somebody has just counted by hand.
 *
 * So the close goes through whether or not this does. A missing photograph is a
 * question for a manager; a lost day close is a night's takings nobody can
 * account for, and the two are not the same size of problem.
 */

/** A webcam still at 640px wide. Anything larger is a face, not more evidence. */
const MAX_BYTES = 2 * 1024 * 1024;

export async function POST(request: Request) {
  const staff = await currentStaff();
  if (!staff) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("photo") as File | null;

  if (!file) return NextResponse.json({ error: "No photo" }, { status: 400 });
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "That photo is too large" }, { status: 413 });
  }

  const path = `pos-close/${staff.staff_id}-${Date.now()}.jpg`;

  const { data, error } = await supabaseAdminLive.storage
    .from("media")
    .upload(path, new Uint8Array(await file.arrayBuffer()), {
      contentType: "image/jpeg",
      upsert: false,
    });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: pub } = supabaseAdminLive.storage.from("media").getPublicUrl(data.path);
  return NextResponse.json({ url: pub.publicUrl });
}
