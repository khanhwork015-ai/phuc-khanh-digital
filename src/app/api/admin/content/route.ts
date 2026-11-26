import { NextResponse } from "next/server";
import { getSqliteDb } from "@/db/sqlite";
import { requireDashboardReadApi } from "@/lib/api-auth";
import { syncFromJavisLocalDir } from "@/lib/javis-fs";

export async function GET() {
  const auth = await requireDashboardReadApi();
  if (!auth.ok) return auth.response;

  const syncResult = syncFromJavisLocalDir();
  const db = getSqliteDb();

  const rows = db
    .prepare(
      `SELECT ci.id, ci.javis_item_id AS javisItemId, ci.title, ci.caption, ci.media_type AS mediaType,
              ci.media_urls AS mediaUrlsJson, ci.status, ci.client_feedback AS clientFeedback,
              ci.scheduled_at AS scheduledAt, ci.updated_at AS updatedAt,
              c.business_name AS customerName, c.javis_client_slug AS customerSlug
       FROM content_items ci
       INNER JOIN customers c ON ci.customer_id = c.id
       ORDER BY ci.updated_at DESC`,
    )
    .all() as Array<{
    id: string;
    javisItemId: string;
    title: string;
    caption: string;
    mediaType: string;
    mediaUrlsJson: string;
    status: string;
    clientFeedback: string | null;
    scheduledAt: string | null;
    updatedAt: string;
    customerName: string;
    customerSlug: string | null;
  }>;

  const items = rows.map((r) => ({
    ...r,
    mediaUrls: JSON.parse(r.mediaUrlsJson || "[]") as string[],
  }));

  return NextResponse.json({ ok: true, syncResult, items });
}
