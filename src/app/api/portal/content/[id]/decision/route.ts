import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { contentItems } from "@/db/schema";
import { requireSessionApi } from "@/lib/api-auth";

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

  const db = getDb();
  const [updated] = await db
    .update(contentItems)
    .set({
      status: parsed.data.decision,
      clientFeedback: parsed.data.decision === "changes_requested" ? parsed.data.clientFeedback ?? null : null,
      updatedAt: new Date(),
    })
    .where(and(eq(contentItems.id, id), eq(contentItems.customerId, auth.user.customerId)))
    .returning();

  if (!updated) {
    return NextResponse.json({ ok: false, message: "Không tìm thấy bài viết thuộc tài khoản của bạn." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, item: updated });
}
