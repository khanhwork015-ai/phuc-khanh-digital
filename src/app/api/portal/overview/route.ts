import { NextResponse } from "next/server";
import { getSqliteDb } from "@/db/sqlite";
import { requireSessionApi } from "@/lib/api-auth";
import {
  customerActions,
  customerCanSee,
  engineTimeToIso,
  listBridgePosts,
  mapBridgeStatus,
  mediaUrlFor,
} from "@/lib/approval-bridge";
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

  await syncFromJavisLocalDir();
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

  const rawAssets = db
    .prepare(
      `SELECT id, title, asset_type AS assetType, file_url AS fileUrl, metadata, updated_at AS updatedAt
       FROM brand_assets WHERE customer_id = ? ORDER BY updated_at DESC`,
    )
    .all(auth.user.customerId) as Array<{
    id: string;
    title: string;
    assetType: string;
    fileUrl: string | null;
    metadata: string | null;
    updatedAt: string;
  }>;

  const assets = rawAssets.map((a) => {
    let parsedMeta: Record<string, unknown> | null = null;
    try {
      parsedMeta = a.metadata ? (JSON.parse(a.metadata) as Record<string, unknown>) : null;
    } catch {
      parsedMeta = null;
    }
    return { ...a, metadata: parsedMeta };
  });

  const slugRow = db
    .prepare("SELECT javis_client_slug AS slug FROM customers WHERE id = ? LIMIT 1")
    .get(auth.user.customerId) as { slug: string | null } | undefined;
  const slug = slugRow?.slug ?? "";

  const posts = slug ? (await listBridgePosts().catch(() => [])).filter((p) => p.fanpage_slug === slug) : [];
  const rows = db
    .prepare("SELECT id, javis_item_id AS file FROM content_items WHERE customer_id = ?")
    .all(auth.user.customerId) as Array<{ id: string; file: string }>;
  const idByFile = new Map(rows.map((r) => [r.file, r.id]));

  const order = ["Chờ khách duyệt", "Sửa lại", "Đã duyệt", "Chờ đăng", "Đã đăng"];
  const contentItems = posts
    .filter((p) => customerCanSee(p) && idByFile.has(p.file))
    .map((p) => ({
      id: idByFile.get(p.file)!,
      title: p.title,
      caption: p.body,
      mediaUrls: p.images.map(mediaUrlFor),
      status: mapBridgeStatus(p.status) ?? "pending_review",
      clientFeedback: p.edit_requested_by_role === "customer" ? p.feedback || null : null,
      scheduledAt: engineTimeToIso(p.publish_at || p.scheduled_at),
      publishedAt: engineTimeToIso(p.published_at),
      publishedUrl: p.post_id ? `https://www.facebook.com/${p.post_id}` : null,
      fanpageName: p.fanpage_name,
      logoUrl: p.fanpage_logo ? mediaUrlFor(p.fanpage_logo) : null,
      actions: customerActions(p),
    }))
    .sort((a, b) => {
      const sa = posts.find((p) => idByFile.get(p.file) === a.id)?.status ?? "";
      const sb = posts.find((p) => idByFile.get(p.file) === b.id)?.status ?? "";
      return order.indexOf(sa) - order.indexOf(sb) || (b.scheduledAt ?? "").localeCompare(a.scheduledAt ?? "");
    });

  const internalReadyCount = posts.filter((p) => !customerCanSee(p)).length;

  return NextResponse.json({
    ok: true,
    customer,
    brandAssets: assets,
    contentItems,
    internalReadyCount,
  });
}
