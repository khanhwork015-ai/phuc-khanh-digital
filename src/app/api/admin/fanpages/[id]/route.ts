import { NextResponse } from "next/server";
import { z } from "zod";
import { getSqliteDb } from "@/db/sqlite";
import { requireAdminApi } from "@/lib/api-auth";

const toggleApprovalSchema = z.object({
  requireCustomerApproval: z.boolean(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const parsed = toggleApprovalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Dữ liệu cập nhật không hợp lệ." }, { status: 400 });
  }

  const db = getSqliteDb();
  const existing = db.prepare("SELECT id FROM customers WHERE id = ? LIMIT 1").get(id) as
    | { id: string }
    | undefined;
  if (!existing) {
    return NextResponse.json({ ok: false, message: "Không tìm thấy Fanpage." }, { status: 404 });
  }

  if (parsed.data.requireCustomerApproval) {
    const activeAccounts = db
      .prepare(
        "SELECT count(*) AS total FROM users WHERE role = 'CUSTOMER' AND is_active = 1 AND customer_id = ?",
      )
      .get(id) as { total: number };
    if (activeAccounts.total === 0) {
      return NextResponse.json(
        {
          ok: false,
          message: "Fanpage cần có ít nhất 1 tài khoản khách đang hoạt động mới có thể bật Cần Khách Duyệt.",
        },
        { status: 400 },
      );
    }
  }

  const now = new Date().toISOString();
  db.prepare("UPDATE customers SET require_customer_approval = ?, updated_at = ? WHERE id = ?").run(
    parsed.data.requireCustomerApproval ? 1 : 0,
    now,
    id,
  );

  return NextResponse.json({
    ok: true,
    requireCustomerApproval: parsed.data.requireCustomerApproval,
  });
}
