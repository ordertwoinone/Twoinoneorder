import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const folder = searchParams.get("folder") || "";

  const { data, error } = await supabaseAdmin.storage
    .from("media")
    .list(folder, { limit: 200, sortBy: { column: "created_at", order: "desc" } });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const files = (data || [])
    .filter((f) => f.name !== ".emptyFolderPlaceholder")
    .map((f) => {
      const path = folder ? `${folder}/${f.name}` : f.name;
      const { data: { publicUrl } } = supabaseAdmin.storage.from("media").getPublicUrl(path);
      return { name: f.name, path, url: publicUrl, created_at: f.created_at, size: f.metadata?.size };
    });

  return NextResponse.json(files);
}

export async function DELETE(request: Request) {
  const { path } = await request.json();
  if (!path) return NextResponse.json({ error: "No path provided" }, { status: 400 });

  const { error } = await supabaseAdmin.storage.from("media").remove([path]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
