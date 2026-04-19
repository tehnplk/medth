"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";

type Props = {
  value: string;
  onChange: (path: string) => void;
  kind: "staff" | "branch";
  label?: string;
  previewClassName?: string;
};

export default function ImageUploader({
  value,
  onChange,
  kind,
  label,
  previewClassName,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", kind);

      const response = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as { path?: string; error?: string };

      if (!response.ok || !data.path) {
        throw new Error(data.error ?? "อัปโหลดไม่สำเร็จ");
      }
      onChange(data.path);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "อัปโหลดไม่สำเร็จ");
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const previewSize = previewClassName ?? "h-24 w-24";

  return (
    <div className="space-y-2">
      {label ? (
        <span className="block text-sm font-medium text-slate-700">{label}</span>
      ) : null}
      <div className="flex items-center gap-3">
        <div
          className={`relative ${previewSize} overflow-hidden rounded-2xl border border-sky-200 bg-slate-50 flex items-center justify-center text-slate-400`}
        >
          {value ? (
            <Image
              src={value}
              alt="preview"
              fill
              sizes="96px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <ImagePlus className="h-6 w-6" />
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            className="inline-flex items-center gap-1.5 rounded-full border border-sky-300 bg-white px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-50 disabled:opacity-60"
          >
            {isUploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ImagePlus className="h-3.5 w-3.5" />
            )}
            {isUploading ? "กำลังอัปโหลด..." : value ? "เปลี่ยนรูป" : "เลือกรูป"}
          </button>
          {value ? (
            <button
              type="button"
              onClick={() => onChange("")}
              disabled={isUploading}
              className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
            >
              <X className="h-3.5 w-3.5" />
              ลบรูป
            </button>
          ) : null}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        className="hidden"
      />
      {error ? (
        <p className="text-xs font-medium text-red-600">{error}</p>
      ) : null}
    </div>
  );
}
