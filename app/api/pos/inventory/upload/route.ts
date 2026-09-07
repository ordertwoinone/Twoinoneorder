export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import sharp from "sharp";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { inventoryStaff } from "@/lib/inventory/api";

/**
 * A photograph of what is on the shelf.
 *
 * Its own endpoint rather than the admin panel's uploader, for the same reason
 * /api/pos/close-photo is: till staff hold a POS session, not an admin one, and
 * /api/admin/upload is behind middleware that asks for the other kind. The
 * person counting the fridge has no Google login and should not need one.
 *
 * Re-encoded here rather than stored as sent. A phone camera produces four
 * megabytes of JPEG for something the count sheet draws at thirty-six pixels,
 * and a hundred of those is a store room nobody can load over café wifi.
 */

/** Larger than any thumbnail needs, small enough that a shelf of them loads. */
const MAX_WIDTH = 600;

/** A phone photo before re-encoding. Past this it is not a shelf, it is a file. */
const MAX_BYTES = 15 * 1024 * 1024;

export async function POST(request: Request) {
  const { deny } = await inventoryStaff();
  if (deny) return deny;

  const form = await request.formData();
  const file = form.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "No image" }, { status: 400 });
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "That is not an image" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `That image is ${(file.size / 1048576).toFixed(0)} MB. The limit is ${MAX_BYTES / 1048576} MB.` },
      { status: 413 },
    );
  }

  const source = Buffer.from(await file.arrayBuffer());

  let webp: Buffer;
  try {
    webp = await sharp(source)
      .rotate() // EXIF orientation applied before it is stripped
      .resize({ width: MAX_WIDTH, height: MAX_WIDTH, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80, effort: 4 })
      .toBuffer();
  } catch {
    // A file that claims image/* but sharp cannot read — a rename, or a format
    // it was not built with. Better said plainly than as a 500.
    return NextResponse.json({ error: "That image could not be read" }, { status: 400 });
  }

  const path = `inventory/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;

  const { data, error } = await supabaseAdminLive.storage
    .from("media")
    .upload(path, new Uint8Array(webp), { contentType: "image/webp", upsert: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: pub } = supabaseAdminLive.storage.from("media").getPublicUrl(data.path);
  return NextResponse.json({ url: pub.publicUrl });
}
