import { NextResponse } from "next/server";
import sharp from "sharp";
import { supabaseAdmin } from "@/lib/supabase-admin";

const SKIP_TYPES = ["image/svg+xml", "image/gif"];

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File;
  const folder = (formData.get("folder") as string) || "general";

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const bytes = await file.arrayBuffer();
  let buffer = Buffer.from(bytes);
  let contentType = file.type;
  let ext = file.name.split(".").pop()?.toLowerCase() || "jpg";

  // Convert to WebP unless it's SVG or GIF (which sharp can't handle well)
  if (!SKIP_TYPES.includes(file.type)) {
    buffer = await sharp(buffer)
      .webp({ quality: 90 })
      .toBuffer();
    contentType = "image/webp";
    ext = "webp";
  }

  const fileName = `${folder}/${Date.now()}.${ext}`;

  const { data, error } = await supabaseAdmin.storage
    .from("media")
    .upload(fileName, buffer, { contentType, upsert: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from("media")
    .getPublicUrl(data.path);

  return NextResponse.json({ url: publicUrl });
}
