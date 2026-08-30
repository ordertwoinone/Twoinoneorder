export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server";
import sharp from "sharp";
import { supabaseAdminLive } from "@/lib/supabase-admin";

/* Files sharp must not touch. SVG and GIF are images it would flatten or
   strip; everything else here is not an image at all — the kiosk idle screen
   takes video, and running a video through an image encoder throws. */
const SKIP_TYPES = ["image/svg+xml", "image/gif"];

/** Uploaded as sent: whatever sharp has no business re-encoding. */
function passThrough(file: File): boolean {
  return (
    SKIP_TYPES.includes(file.type) ||
    file.type.startsWith("video/") ||
    file.type.startsWith("audio/") ||
    !file.type.startsWith("image/")
  );
}

/** Roughly what a portrait kiosk loop weighs; well past any photo. */
const MAX_BYTES = 120 * 1024 * 1024;

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File;
  const folder = (formData.get("folder") as string) || "general";

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `That file is ${(file.size / 1048576).toFixed(0)} MB. The limit is ${MAX_BYTES / 1048576} MB.` },
      { status: 413 },
    );
  }

  const arrayBuffer: ArrayBuffer = await file.arrayBuffer();
  let uploadData: Uint8Array = new Uint8Array(arrayBuffer);
  let contentType = file.type;
  let ext = file.name.split(".").pop()?.toLowerCase() || "jpg";

  if (!passThrough(file)) {
    const webp = await sharp(Buffer.from(arrayBuffer))
      .rotate() // apply EXIF orientation before it gets stripped
      /* 1600px at q82 rather than 2000 at q85. What is stored is now what is
         served — there is no optimizer downstream resizing it for a phone — so
         the stored file has to be the one a phone should get. A food card is
         never shown above about 700px, and this still leaves room for retina. */
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82, effort: 4 })
      .toBuffer();
    uploadData = new Uint8Array(webp);
    contentType = "image/webp";
    ext = "webp";
  }

  const fileName = `${folder}/${Date.now()}.${ext}`;

  const { data, error } = await supabaseAdminLive.storage
    .from("media")
    .upload(fileName, uploadData, { contentType, upsert: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: { publicUrl } } = supabaseAdminLive.storage
    .from("media")
    .getPublicUrl(data.path);

  return NextResponse.json({ url: publicUrl });
}

