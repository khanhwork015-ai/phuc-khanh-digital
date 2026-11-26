import { NextResponse } from "next/server";
import { getSqliteDb } from "@/db/sqlite";
import { requireDashboardReadApi } from "@/lib/api-auth";
import { adminActions, listBridgePosts, mediaUrlFor } from "@/lib/approval-bridge";
import { syncFromJavisLocalDir } from "@/lib/javis-fs";

export async function GET() {
  const auth = await requireDashboardReadApi();
  if (!auth.ok) return auth.response;

  const syncResult = await syncFromJavisLocalDir();
  const db = getSqliteDb();
  const posts = new Map((await listBridgePosts().catch(() => [])).map((p) => [p.file, p]));

  const rows = db
    .prepare(
      `SELECT ci.id, ci.javis_item_id AS file, ci.title, ci.caption, ci.media_urls AS mediaUrlsJson,
              ci.status, ci.scheduled_at AS scheduledAt, ci.updated_at AS updatedAt,
              c.business_name AS customerName, c.javis_client_slug AS customerSlug
       FROM content_items ci
       INNER JOIN customers c ON ci.customer_id = c.id`,
    )
    .all() as Array<{
    id: string;
    file: string;
    title: string;
    caption: string;
    mediaUrlsJson: string;
    status: string;
    scheduledAt: string | null;
    updatedAt: string;
    customerName: string;
    customerSlug: string | null;
  }>;

  const isAdmin = auth.user.role === "ADMIN";
  const order = ["pending_review", "changes_requested", "approved", "pending_client", "scheduled", "published"];
  const items = rows
    .map((r) => {
      const post = posts.get(r.file);
      return {
        id: r.id,
        code: post?.code ?? r.file,
        title: r.title,
        caption: r.caption,
        mediaUrls: JSON.parse(r.mediaUrlsJson || "[]") as string[],
        status: r.status,
        rawStatus: post?.status ?? "",
        scheduledAt: r.scheduledAt,
        customerName: post?.fanpage_name || r.customerName,
        customerSlug: r.customerSlug,
        logoUrl: post?.fanpage_logo ? mediaUrlFor(post.fanpage_logo) : null,
        feedback: post?.feedback ?? "",
        feedbackHistory: post?.feedback_history ?? "",
        scheduleError: post?.schedule_error ?? "",
        editRequestedByRole: post?.edit_requested_by_role ?? "",
        postId: post?.post_id ?? "",
        actions: isAdmin && post ? adminActions(post) : [],
      };
    })
    .sort(
      (a, b) =>
        order.indexOf(a.status) - order.indexOf(b.status) ||
        (a.scheduledAt ?? "9999").localeCompare(b.scheduledAt ?? "9999"),
    );

  return NextResponse.json({ ok: true, syncResult, items });
}
