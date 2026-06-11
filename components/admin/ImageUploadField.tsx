"use client";
import { useEffect, useRef, useState } from "react";
import { Upload, Link } from "lucide-react";

interface Props {
  value: string;
  onChange: (url: string) => void;
  label: string;
  folder?: string;
  hint?: string;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ImageUploadField({ value, onChange, label, folder = "general", hint }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);

  // Reset info when the image URL changes; try to read the file
  // size from the server (works for same-origin / Supabase storage)
  useEffect(() => {
    setDims(null);
    setFileSize(null);
    if (!value) return;
    let cancelled = false;
    fetch(value, { method: "HEAD" })
      .then((res) => {
        const len = res.headers.get("content-length");
        if (!cancelled && len) setFileSize(parseInt(len, 10));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [value]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    form.append("folder", folder);

    const res = await fetch("/api/admin/upload", { method: "POST", body: form });
    const data = await res.json();
    if (data.url) onChange(data.url);
    setUploading(false);
    e.target.value = "";
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="text-xs font-semibold text-gray-700">{label}</label>
        {hint && <span className="text-[10px] text-orange-500 font-medium">{hint}</span>}
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Link size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full pl-8 pr-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            placeholder="Paste URL or upload →"
          />
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-600 transition-colors shrink-0 disabled:opacity-50"
        >
          <Upload size={14} />
          {uploading ? "Uploading..." : "Upload"}
        </button>
        <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      </div>
      {value && (
        <div className="mt-2 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="preview"
            className="h-14 w-24 rounded-lg object-cover border border-gray-100"
            onLoad={(e) => {
              const img = e.currentTarget;
              setDims({ w: img.naturalWidth, h: img.naturalHeight });
            }}
          />
          <div className="text-[11px] text-gray-500 leading-relaxed">
            {dims ? (
              <>
                <p className="font-semibold text-gray-700">{dims.w} × {dims.h} px{fileSize !== null ? ` · ${formatBytes(fileSize)}` : ""}</p>
                {hint && <p className="text-orange-500">Recommended: {hint}</p>}
              </>
            ) : hint ? (
              <p className="text-orange-400">Recommended: {hint}</p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
