import { NextResponse } from "next/server";
import { z } from "zod";
import { getSqliteDb } from "@/db/sqlite";
import { requireSessionApi } from "@/lib/api-auth";
import { writeApprovalDecisionToJavis } from "@/lib/javis-fs";

const decisionSchema = z
  .object({
    decision: z.enum(["approved", "changes_requested"]),
    clientFeedback: z.string().trim().max(1500, "Góp ý tối đa 1500 ký tự.").optional(),
  })
  .refine(
    (data) => data.decision !== "changes_requested" || (data.clientFeedback && data.clientFeedback.length >= 3),
    { message: "Vui lòng nhập nội dung cần chỉnh sửa (tối thiểu 3 ký tự)." },
  );

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSessionApi();
  if (!auth.ok) return auth.response;

  if (!auth.user.customerId) {
    return NextResponse.json({ ok: false, message: "Không có hồ sơ khách hàng liên kết." }, { status: 403 });
  }

  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const parsed = decisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? "Dữ liệu phản hồi không hợp lệ." },
      { status: 400 },
    );
  }

  const db = getSqliteDb();
  const existing = db
    .prepare("SELECT id, javis_item_id AS javisItemId FROM content_items WHERE id = ? AND customer_id = ? LIMIT 1")
    .get(id, auth.user.customerId) as { id: string; javisItemId: string } | undefined;

  if (!existing) {
    return NextResponse.json({ ok: false, message: "Không tìm thấy bài viết thuộc tài khoản của bạn." }, { status: 404 });
  }

  const feedback = parsed.data.decision === "changes_requested" ? parsed.data.clientFeedback ?? null : null;
  const now = new Date().toISOString();

  db.prepare("UPDATE content_items SET status = ?, client_feedback = ?, updated_at = ? WHERE id = ?").run(
    parsed.data.decision,
    feedback,
    now,
    id,
  );

  writeApprovalDecisionToJavis(existing.javisItemId, parsed.data.decision, feedback);

  const updated = db
    .prepare(
      `SELECT id, title, caption, media_type AS mediaType, media_urls AS mediaUrlsJson,
              status, client_feedback AS clientFeedback, scheduled_at AS scheduledAt,
              published_at AS publishedAt, published_url AS publishedUrl
       FROM content_items WHERE id = ?`,
    )
    .get(id) as {
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
  };

  return NextResponse.json({
    ok: true,
    item: {
      ...updated,
      mediaUrls: JSON.parse(updated.mediaUrlsJson || "[]") as string[],
    },
  });
}
