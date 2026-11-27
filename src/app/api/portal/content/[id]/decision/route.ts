import { NextResponse } from "next/server";
import { z } from "zod";
import { getSqliteDb } from "@/db/sqlite";
import { requireSessionApi } from "@/lib/api-auth";
import { decideBridgePost, listBrandLinks } from "@/lib/approval-bridge";
import { syncFromJavisLocalDir } from "@/lib/javis-fs";

const decisionSchema = z
  .object({
    action: z.enum(["approve", "request_edit"]),
    feedback: z.string().trim().max(1500, "Góp ý tối đa 1500 ký tự.").optional(),
  })
  .refine((d) => d.action !== "request_edit" || (d.feedback && d.feedback.length >= 3), {
    message: "Vui lòng ghi rõ lý do cần chỉnh sửa (tối thiểu 3 ký tự).",
  });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSessionApi();
  if (!auth.ok) return auth.response;

  if (auth.user.role !== "CUSTOMER" || !auth.user.customerId) {
    return NextResponse.json({ ok: false, message: "Chỉ tài khoản khách hàng mới duyệt ở cổng này." }, { status: 403 });
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
    .prepare(
      `SELECT ci.javis_item_id AS file, c.javis_client_slug AS slug, c.business_name AS businessName
       FROM content_items ci INNER JOIN customers c ON ci.customer_id = c.id
       WHERE ci.id = ? AND ci.customer_id = ? LIMIT 1`,
    )
    .get(id, auth.user.customerId) as { file: string; slug: string | null; businessName: string } | undefined;

  if (!existing || !existing.slug) {
    return NextResponse.json({ ok: false, message: "Không tìm thấy bài viết thuộc tài khoản của bạn." }, { status: 404 });
  }

  if (parsed.data.action === "approve") {
    const brandLinks = await listBrandLinks().catch(() => null);
    if (brandLinks?.brands?.length) {
      const connected = Boolean(brandLinks.brands.find((b) => b.slug === existing.slug)?.connected);
      if (!connected) {
        return NextResponse.json(
          { ok: false, message: "Fanpage chưa kết nối — chế độ xem bài mẫu chỉ hỗ trợ gửi yêu cầu sửa." },
          { status: 409 },
        );
      }
    }
  }

  // The engine re-checks visibility and the allowed step (e.g. not before Admin approval).
  const result = await decideBridgePost({
    file: existing.file,
    action: parsed.data.action,
    actorRole: "customer",
    actorUsername: auth.user.username,
    actorName: `Khách ${existing.businessName}`,
    actorFanpages: [existing.slug],
    feedback: parsed.data.feedback,
  });
  await syncFromJavisLocalDir();

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, message: result.error || result.message || "Thao tác thất bại." },
      { status: result.forbidden ? 409 : 400 },
    );
  }
  return NextResponse.json({ ok: true, message: result.message ?? "Đã ghi nhận." });
}
