import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { sessions, users } from "@/db/schema";
import { requireAdminApi } from "@/lib/api-auth";
import { hashPassword } from "@/lib/auth";
import { updateAccountSchema } from "@/lib/auth-schema";

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

  const parsed = updateAccountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? "Dữ liệu cập nhật không hợp lệ." },
      { status: 400 },
    );
  }

  if (id === auth.user.id && parsed.data.isActive === false) {
    return NextResponse.json(
      { ok: false, message: "Không thể tự khóa tài khoản quản trị viên đang đăng nhập." },
      { status: 400 },
    );
  }

  const updateFields: Partial<{ isActive: boolean; passwordHash: string; updatedAt: Date }> = {
    updatedAt: new Date(),
  };

  if (typeof parsed.data.isActive === "boolean") {
    updateFields.isActive = parsed.data.isActive;
  }
  if (parsed.data.newPassword) {
    updateFields.passwordHash = hashPassword(parsed.data.newPassword);
  }

  const db = getDb();
  const [updated] = await db
    .update(users)
    .set(updateFields)
    .where(eq(users.id, id))
    .returning({
      id: users.id,
      username: users.username,
      role: users.role,
      isActive: users.isActive,
      customerId: users.customerId,
    });

  if (!updated) {
    return NextResponse.json({ ok: false, message: "Không tìm thấy tài khoản." }, { status: 404 });
  }

  if (parsed.data.isActive === false || parsed.data.newPassword) {
    await db.delete(sessions).where(eq(sessions.userId, id));
  }

  return NextResponse.json({ ok: true, account: updated });
}
