import { NextResponse } from "next/server";
import sharp from "sharp";
import { supabaseAdmin } from "@/lib/supabase-admin";

const SKIP_TYPES = ["image/svg+xml", "image/gif"];

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File;
  const folder = (formData.get("folder") as string) || "general";

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const arrayBuffer: ArrayBuffer = await file.arrayBuffer();
  let uploadData: Uint8Array = new Uint8Array(arrayBuffer);
  let contentType = file.type;
  let ext = file.name.split(".").pop()?.toLowerCase() || "jpg";

  if (!SKIP_TYPES.includes(file.type)) {
    const webp = await sharp(Buffer.from(arrayBuffer)).webp({ quality: 90 }).toBuffer();
    uploadData = new Uint8Array(webp);
    contentType = "image/webp";
    ext = "webp";
  }

  const fileName = `${folder}/${Date.now()}.${ext}`;

  const { data, error } = await supabaseAdmin.storage
    .from("media")
    .upload(fileName, uploadData, { contentType, upsert: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from("media")
    .getPublicUrl(data.path);

  return NextResponse.json({ url: publicUrl });
}
