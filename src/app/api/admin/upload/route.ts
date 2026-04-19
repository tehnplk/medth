import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ALLOWED_KINDS = new Set(["staff", "branch"]);
const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const kind = String(formData.get("kind") ?? "");
    const file = formData.get("file");

    if (!ALLOWED_KINDS.has(kind)) {
      return NextResponse.json({ error: "ชนิดไฟล์ไม่ถูกต้อง" }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "กรุณาเลือกไฟล์" }, { status: 400 });
    }

    const ext = ALLOWED_MIME[file.type];
    if (!ext) {
      return NextResponse.json({ error: "รองรับเฉพาะ JPEG / PNG / WebP / GIF" }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "ไฟล์ใหญ่เกิน 5 MB" }, { status: 400 });
    }

    const filename = `${Date.now()}-${randomBytes(6).toString("hex")}${ext}`;
    const dir = path.join(process.cwd(), "public", "images", kind);
    await mkdir(dir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, filename), buffer);

    return NextResponse.json({ path: `/images/${kind}/${filename}` }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "อัปโหลดไม่สำเร็จ" }, { status: 500 });
  }
}
