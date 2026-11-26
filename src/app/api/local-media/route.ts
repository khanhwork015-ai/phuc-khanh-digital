import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/api-auth";
import { getJavisFanpagesDir } from "@/lib/javis-fs";

const mimeTypes: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".pdf": "application/pdf",
  ".svg": "image/svg+xml",
};

export async function GET(req: Request) {
  const auth = await requireSessionApi();
  if (!auth.ok) return auth.response;

  const fanpagesDir = getJavisFanpagesDir();
  if (!fanpagesDir) {
    return NextResponse.json({ ok: false, message: "Chưa cấu hình thư mục Javis." }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const relPath = searchParams.get("path") ?? "";
  const resolved = path.resolve(fanpagesDir, relPath);

  if (!resolved.startsWith(fanpagesDir + path.sep) || !existsSync(resolved)) {
    return NextResponse.json({ ok: false, message: "Không tìm thấy tệp." }, { status: 404 });
  }

  const ext = path.extname(resolved).toLowerCase();
  const contentType = mimeTypes[ext] ?? "application/octet-stream";
  const buffer = readFileSync(resolved);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=60",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src data:",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
