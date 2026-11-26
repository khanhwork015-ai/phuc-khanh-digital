import { NextResponse } from "next/server";
import { getSqliteDb } from "@/db/sqlite";
import { requireSessionApi } from "@/lib/api-auth";
import { syncFromJavisLocalDir } from "@/lib/javis-fs";

export async function GET() {
  const auth = await requireSessionApi();
  if (!auth.ok) return auth.response;

  if (!auth.user.customerId) {
    return NextResponse.json(
      { ok: false, message: "Tài khoản này chưa được liên kết với hồ sơ khách hàng nào." },
      { status: 404 },
    );
  }

  syncFromJavisLocalDir();
  const db = getSqliteDb();

  const customer = db
    .prepare(
      `SELECT code, business_name AS businessName, full_name AS fullName, plan,
              contract_status AS contractStatus, fanpage_url AS fanpageUrl
       FROM customers WHERE id = ? LIMIT 1`,
    )
    .get(auth.user.customerId);

  if (!customer) {
    return NextResponse.json({ ok: false, message: "Không tìm thấy hồ sơ khách hàng." }, { status: 404 });
  }

  const assets = db
    .prepare(
      `SELECT id, title, asset_type AS assetType, file_url AS fileUrl, updated_at AS updatedAt
       FROM brand_assets WHERE customer_id = ? ORDER BY updated_at DESC`,
    )
    .all(auth.user.customerId);

  const rawItems = db
    .prepare(
      `SELECT id, title, caption, media_type AS mediaType, media_urls AS mediaUrlsJson,
              status, client_feedback AS clientFeedback, scheduled_at AS scheduledAt,
              published_at AS publishedAt, published_url AS publishedUrl
       FROM content_items WHERE customer_id = ? ORDER BY updated_at DESC`,
    )
    .all(auth.user.customerId) as Array<{
    id: string;
    title: string;
    caption: string;
    mediaType: string;
    mediaUrlsJson: string;
    status: string;
    clientFeedback: string | null;
    scheduledAt: string | null;
    publishedAt: string | null;
    publishedUrl: string | null;
  }>;

  const contentItems = rawItems.map((item) => ({
    ...item,
    mediaUrls: JSON.parse(item.mediaUrlsJson || "[]") as string[],
  }));

  return NextResponse.json({
    ok: true,
    customer,
    brandAssets: assets,
    contentItems,
  });
}
