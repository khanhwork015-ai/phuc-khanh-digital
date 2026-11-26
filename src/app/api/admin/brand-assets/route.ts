import { NextResponse } from "next/server";
import { z } from "zod";
import { getSqliteDb } from "@/db/sqlite";
import { brandAssetTypes } from "@/db/types";
import { requireCustomerManageApi, requireDashboardReadApi } from "@/lib/api-auth";
import { extractHexColors, syncFromJavisLocalDir } from "@/lib/javis-fs";

const createBrandAssetSchema = z.object({
  customerId: z.string().uuid("Khách hàng không hợp lệ."),
  title: z.string().trim().min(2, "Vui lòng nhập tên tài liệu (tối thiểu 2 ký tự).").max(160),
  assetType: z.enum(brandAssetTypes).default("guideline"),
  fileUrl: z.string().trim().max(500).optional().or(z.literal("")),
  content: z.string().trim().max(8000).optional().or(z.literal("")),
  colorsText: z.string().trim().max(500).optional().or(z.literal("")),
  hotline: z.string().trim().max(100).optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  tone: z.string().trim().max(300).optional().or(z.literal("")),
  style: z.string().trim().max(300).optional().or(z.literal("")),
});

export async function GET() {
  const auth = await requireDashboardReadApi();
  if (!auth.ok) return auth.response;

  await syncFromJavisLocalDir();
  const db = getSqliteDb();

  const rows = db
    .prepare(
      `SELECT ba.id, ba.customer_id AS customerId, ba.title, ba.asset_type AS assetType,
              ba.file_url AS fileUrl, ba.metadata, ba.updated_at AS updatedAt,
              c.business_name AS customerName, c.javis_client_slug AS customerSlug
       FROM brand_assets ba
       INNER JOIN customers c ON ba.customer_id = c.id
       ORDER BY ba.updated_at DESC`,
    )
    .all() as Array<{
    id: string;
    customerId: string;
    title: string;
    assetType: string;
    fileUrl: string | null;
    metadata: string | null;
    updatedAt: string;
    customerName: string;
    customerSlug: string | null;
  }>;

  const assets = rows.map((row) => {
    let parsedMeta: Record<string, unknown> | null = null;
    try {
      parsedMeta = row.metadata ? (JSON.parse(row.metadata) as Record<string, unknown>) : null;
    } catch {
      parsedMeta = null;
    }
    return {
      ...row,
      metadata: parsedMeta,
    };
  });

  return NextResponse.json({ ok: true, assets });
}

export async function POST(req: Request) {
  const auth = await requireCustomerManageApi();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const parsed = createBrandAssetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." },
      { status: 400 },
    );
  }

  const db = getSqliteDb();
  const customer = db.prepare("SELECT id FROM customers WHERE id = ? LIMIT 1").get(parsed.data.customerId);
  if (!customer) {
    return NextResponse.json({ ok: false, message: "Không tìm thấy khách hàng." }, { status: 404 });
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const colors = extractHexColors(`${parsed.data.colorsText ?? ""} ${parsed.data.content ?? ""}`);
  const metadataJson = JSON.stringify({
    source: "manual",
    content: parsed.data.content || null,
    colors,
    hotline: parsed.data.hotline || null,
    address: parsed.data.address || null,
    tone: parsed.data.tone || null,
    style: parsed.data.style || null,
  });

  db.prepare(
    "INSERT INTO brand_assets (id, customer_id, title, asset_type, file_url, metadata, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).run(
    id,
    parsed.data.customerId,
    parsed.data.title,
    parsed.data.assetType,
    parsed.data.fileUrl || null,
    metadataJson,
    now,
  );

  return NextResponse.json({ ok: true, id }, { status: 201 });
}
