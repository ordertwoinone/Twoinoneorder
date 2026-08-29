"use client";
import { useEffect, useRef, useState } from "react";
import { Link, Upload } from "lucide-react";

/**
 * Like ImageUploadField, but it takes video too.
 *
 * Its own component rather than a flag on that one: a video needs a different
 * preview, a much larger size warning, and an upload that can take a minute —
 * and ImageUploadField is on thirty screens that should not change because the
 * kiosk needed a loop.
 */

interface Props {
  value: string;
  onChange: (url: string) => void;
  label: string;
  folder?: string;
  hint?: string;
  /** What the picker offers. Both kinds by default. */
  accept?: string;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** What the URL looks like it is, so the preview knows which tag to use. */
export function looksLikeVideo(url: string): boolean {
  return /\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i.test(url || "");
}

export default function MediaUploadField({
  value,
  onChange,
  label,
  folder = "kiosk",
  hint,
  accept = "image/*,video/*",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [fileSize, setFileSize] = useState<number | null>(null);

  useEffect(() => {
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
    setError("");

    const form = new FormData();
    form.append("file", file);
    form.append("folder", folder);

    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body: form });
      const data = await res.json();
      /* Said out loud rather than swallowed: a video is big enough that a
         failed upload otherwise looks like the field simply ignored you. */
      if (data.url) onChange(data.url);
      else setError(data.error || "That upload did not go through.");
    } catch {
      setError("That upload did not go through.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  const isVideo = looksLikeVideo(value);

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
            value={value ?? ""}
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
          {uploading ? "Uploading…" : "Upload"}
        </button>
        <input ref={inputRef} type="file" accept={accept} onChange={handleFile} className="hidden" />
      </div>

      {error && <p className="mt-1.5 text-[11px] font-medium text-red-600">{error}</p>}

      {value && (
        <div className="mt-2 flex items-center gap-3">
          {isVideo ? (
            <video
              src={value}
              muted
              playsInline
              preload="metadata"
              className="h-16 w-28 rounded-lg object-cover border border-gray-100 bg-black"
            />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={value}
              alt="preview"
              className="h-16 w-28 rounded-lg object-cover border border-gray-100"
            />
          )}
          <div className="text-[11px] text-gray-500 leading-relaxed">
            <p className="font-semibold text-gray-700">
              {isVideo ? "Video" : "Image"}
              {fileSize !== null ? ` · ${formatBytes(fileSize)}` : ""}
            </p>
            {hint && <p className="text-orange-500">Recommended: {hint}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
