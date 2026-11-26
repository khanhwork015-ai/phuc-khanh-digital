import { NextResponse } from "next/server";
import { z } from "zod";
import { getSqliteDb } from "@/db/sqlite";
import { brandAssetTypes } from "@/db/types";
import { requireCustomerManageApi } from "@/lib/api-auth";
import { extractHexColors } from "@/lib/javis-fs";

const updateBrandAssetSchema = z.object({
  title: z.string().trim().min(2, "Vui lòng nhập tên tài liệu (tối thiểu 2 ký tự).").max(160).optional(),
  assetType: z.enum(brandAssetTypes).optional(),
  fileUrl: z.string().trim().max(500).optional().or(z.literal("")),
  content: z.string().trim().max(8000).optional().or(z.literal("")),
  colorsText: z.string().trim().max(500).optional().or(z.literal("")),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireCustomerManageApi();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const parsed = updateBrandAssetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." },
      { status: 400 },
    );
  }

  const db = getSqliteDb();
  const current = db
    .prepare("SELECT id, title, asset_type AS assetType, file_url AS fileUrl, metadata FROM brand_assets WHERE id = ?")
    .get(id) as
    | { id: string; title: string; assetType: string; fileUrl: string | null; metadata: string | null }
    | undefined;

  if (!current) {
    return NextResponse.json({ ok: false, message: "Không tìm thấy tài liệu nhận diện." }, { status: 404 });
  }

  let prevMeta: Record<string, unknown> = {};
  try {
    prevMeta = current.metadata ? (JSON.parse(current.metadata) as Record<string, unknown>) : {};
  } catch {
    prevMeta = {};
  }

  const nextContent = parsed.data.content !== undefined ? parsed.data.content || null : (prevMeta.content as string | null) ?? null;
  const nextColors =
    parsed.data.colorsText !== undefined || parsed.data.content !== undefined
      ? extractHexColors(`${parsed.data.colorsText ?? ""} ${nextContent ?? ""}`)
      : ((prevMeta.colors as string[] | undefined) ?? []);

  const nextMeta = JSON.stringify({
    ...prevMeta,
    content: nextContent,
    colors: nextColors,
  });

  const now = new Date().toISOString();
  db.prepare("UPDATE brand_assets SET title = ?, asset_type = ?, file_url = ?, metadata = ?, updated_at = ? WHERE id = ?").run(
    parsed.data.title ?? current.title,
    parsed.data.assetType ?? current.assetType,
    parsed.data.fileUrl === "" ? null : (parsed.data.fileUrl ?? current.fileUrl),
    nextMeta,
    now,
    id,
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireCustomerManageApi();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const db = getSqliteDb();
  const res = db.prepare("DELETE FROM brand_assets WHERE id = ?").run(id);
  if (res.changes === 0) {
    return NextResponse.json({ ok: false, message: "Không tìm thấy tài liệu nhận diện." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
