"use client";
import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { Trash2, Copy, Check, Upload, FolderOpen, X } from "lucide-react";

const FOLDERS = ["all", "banners", "restaurants", "offers", "brand", "logos", "general"];

interface MediaFile {
  name: string;
  path: string;
  url: string;
  created_at: string;
  size?: number;
}

function formatBytes(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MediaLibrary() {
  const [folder, setFolder] = useState("all");
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<MediaFile | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function load(f: string) {
    setLoading(true);
    const res = await fetch(`/api/admin/media${f !== "all" ? `?folder=${f}` : ""}`);
    const data = await res.json();
    setFiles(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(folder); }, [folder]);

  async function handleCopy(url: string) {
    await navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  }

  async function handleDelete(file: MediaFile) {
    if (!confirm(`Delete "${file.name}"?`)) return;
    setDeleting(file.path);
    await fetch("/api/admin/media", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: file.path }),
    });
    setDeleting(null);
    load(folder);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", folder === "all" ? "general" : folder);
    await fetch("/api/admin/upload", { method: "POST", body: fd });
    setUploading(false);
    if (fileInput.current) fileInput.current.value = "";
    load(folder);
  }

  return (
    <div className="p-4 sm:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Media Library</h1>
          <p className="text-sm text-gray-500 mt-0.5">All uploaded images — click URL to copy</p>
        </div>
        <div>
          <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          <button
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700 transition disabled:opacity-60"
          >
            <Upload size={15} />
            {uploading ? "Uploading..." : "Upload Image"}
          </button>
        </div>
      </div>

      {/* Folder tabs */}
      <div className="flex gap-1.5 flex-wrap mb-5">
        {FOLDERS.map((f) => (
          <button
            key={f}
            onClick={() => setFolder(f)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
              folder === f
                ? "bg-orange-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            <FolderOpen size={12} />
            {f}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-sm text-gray-400 py-12 text-center">Loading...</div>
      ) : files.length === 0 ? (
        <div className="text-sm text-gray-400 py-12 text-center">No images in this folder</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {files.map((file) => (
            <div
              key={file.path}
              className="group relative bg-white rounded-xl border border-gray-100 overflow-hidden"
              style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}
            >
              {/* Thumbnail */}
              <button
                className="w-full aspect-square relative block bg-gray-50"
                onClick={() => setPreview(file)}
              >
                <Image
                  src={file.url}
                  alt={file.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
                />
              </button>

              {/* Info */}
              <div className="px-2 py-2">
                <p className="text-[10px] text-gray-500 truncate">{file.name}</p>
                {file.size && <p className="text-[10px] text-gray-400">{formatBytes(file.size)}</p>}
              </div>

              {/* Action buttons — show on hover */}
              <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleCopy(file.url)}
                  className="w-6 h-6 rounded-md bg-white shadow flex items-center justify-center hover:bg-orange-50"
                  title="Copy URL"
                >
                  {copiedUrl === file.url ? (
                    <Check size={11} className="text-green-600" />
                  ) : (
                    <Copy size={11} className="text-gray-600" />
                  )}
                </button>
                <button
                  onClick={() => handleDelete(file)}
                  disabled={deleting === file.path}
                  className="w-6 h-6 rounded-md bg-white shadow flex items-center justify-center hover:bg-red-50 disabled:opacity-50"
                  title="Delete"
                >
                  <Trash2 size={11} className="text-red-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview modal */}
      {preview && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="bg-white rounded-2xl overflow-hidden max-w-2xl w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-video bg-gray-100">
              <Image src={preview.url} alt={preview.name} fill className="object-contain" sizes="672px" />
            </div>
            <div className="p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{preview.name}</p>
                {preview.size && <p className="text-xs text-gray-400">{formatBytes(preview.size)}</p>}
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handleCopy(preview.url)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 hover:bg-gray-50 transition"
                >
                  {copiedUrl === preview.url ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                  {copiedUrl === preview.url ? "Copied!" : "Copy URL"}
                </button>
                <button onClick={() => setPreview(null)} className="p-1.5 rounded-lg hover:bg-gray-100">
                  <X size={16} className="text-gray-500" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
