export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const FOLDERS = ["banners", "restaurants", "offers", "brand", "logos", "general"];

async function listFolder(folder: string) {
  const { data } = await supabaseAdmin.storage
    .from("media")
    .list(folder, { limit: 500, sortBy: { column: "created_at", order: "desc" } });

  return (data || [])
    .filter((f) => f.name !== ".emptyFolderPlaceholder" && f.metadata)
    .map((f) => {
      const path = `${folder}/${f.name}`;
      const { data: { publicUrl } } = supabaseAdmin.storage.from("media").getPublicUrl(path);
      return { name: f.name, path, url: publicUrl, created_at: f.created_at, size: f.metadata?.size };
    });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const folder = searchParams.get("folder") || "";

  if (!folder || folder === "all") {
    // List all known folders in parallel
    const results = await Promise.all(FOLDERS.map(listFolder));
    const files = results
      .flat()
      .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime());
    return NextResponse.json(files);
  }

  const files = await listFolder(folder);
  return NextResponse.json(files);
}

export async function DELETE(request: Request) {
  const { path } = await request.json();
  if (!path) return NextResponse.json({ error: "No path provided" }, { status: 400 });

  const { error } = await supabaseAdmin.storage.from("media").remove([path]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

