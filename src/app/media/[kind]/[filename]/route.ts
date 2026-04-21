import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const ALLOWED_KINDS = new Set(["staff", "branch"]);
const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

function getMimeType(filename: string) {
  return MIME_BY_EXT[path.extname(filename).toLowerCase()] ?? "application/octet-stream";
}

function isSafeFilename(filename: string) {
  return filename === path.basename(filename);
}

export async function GET(
  _request: Request,
  context: RouteContext<"/media/[kind]/[filename]">,
) {
  const { kind, filename } = await context.params;

  if (!ALLOWED_KINDS.has(kind) || !isSafeFilename(filename)) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const filePath = path.join(process.cwd(), "public", "images", kind, filename);
    const file = await readFile(filePath);

    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": getMimeType(filename),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
