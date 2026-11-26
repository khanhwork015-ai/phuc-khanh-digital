import { NextResponse } from "next/server";
import { z } from "zod";
import { getSqliteDb } from "@/db/sqlite";
import { requireAdminApi } from "@/lib/api-auth";
import { decideBridgePost } from "@/lib/approval-bridge";
import { syncFromJavisLocalDir } from "@/lib/javis-fs";

const adminDecisionSchema = z
  .object({
    action: z.enum(["approve", "request_edit", "retry_schedule"]),
    feedback: z.string().trim().max(1500, "Lý do tối đa 1500 ký tự.").optional(),
  })
  .refine((d) => d.action !== "request_edit" || (d.feedback && d.feedback.length >= 3), {
    message: "Vui lòng ghi rõ lý do cần sửa (tối thiểu 3 ký tự).",
  });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const parsed = adminDecisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." },
      { status: 400 },
    );
  }

  const db = getSqliteDb();
  const existing = db
    .prepare(
      `SELECT
        ci.id,
        ci.customer_id AS customerId,
        ci.javis_item_id AS file,
        c.require_customer_approval AS requireCustomerApproval
       FROM content_items ci
       JOIN customers c ON c.id = ci.customer_id
       WHERE ci.id = ?
       LIMIT 1`,
    )
    .get(id) as { id: string; customerId: string; file: string; requireCustomerApproval: number } | undefined;
  if (!existing) {
    return NextResponse.json({ ok: false, message: "Không tìm thấy bài viết." }, { status: 404 });
  }

  // The post goes to the customer only when the fanpage enables customer approval and has an active customer account.
  const customerAccount = db
    .prepare("SELECT 1 FROM users WHERE role = 'CUSTOMER' AND is_active = 1 AND customer_id = ? LIMIT 1")
    .get(existing.customerId);
  const needsCustomer = Boolean(existing.requireCustomerApproval) && Boolean(customerAccount);

  const result = await decideBridgePost({
    file: existing.file,
    action: parsed.data.action,
    actorRole: "admin",
    actorUsername: auth.user.username,
    actorName: `Admin ${auth.user.username}`,
    feedback: parsed.data.feedback,
    needsCustomer,
  });
  await syncFromJavisLocalDir();

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, message: result.error || result.message || "Thao tác thất bại." },
      { status: result.forbidden ? 409 : 400 },
    );
  }
  return NextResponse.json({ ok: true, message: result.message ?? "Đã cập nhật." });
}
