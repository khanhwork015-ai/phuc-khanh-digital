import { NextResponse } from "next/server";
import { getSqliteDb } from "@/db/sqlite";
import { requireAdminApi } from "@/lib/api-auth";
import { hashPassword, verifyPassword } from "@/lib/auth";
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

  const db = getSqliteDb();
  const current = db.prepare("SELECT id, is_active, password_hash, pin_hash FROM users WHERE id = ?").get(id) as
    | { id: string; is_active: number; password_hash: string; pin_hash: string | null }
    | undefined;

  if (!current) {
    return NextResponse.json({ ok: false, message: "Không tìm thấy tài khoản." }, { status: 404 });
  }

  if (parsed.data.newPassword) {
    if (!parsed.data.currentPassword || !verifyPassword(parsed.data.currentPassword, current.password_hash)) {
      return NextResponse.json(
        { ok: false, message: "Mật khẩu hiện tại không chính xác." },
        { status: 400 },
      );
    }
  }

  const nextActive = typeof parsed.data.isActive === "boolean" ? (parsed.data.isActive ? 1 : 0) : current.is_active;
  const nextHash = parsed.data.newPassword ? hashPassword(parsed.data.newPassword) : current.password_hash;
  const nextPinHash = parsed.data.resetPin ? null : current.pin_hash;
  const now = new Date().toISOString();

  db.prepare("UPDATE users SET is_active = ?, password_hash = ?, pin_hash = ?, updated_at = ? WHERE id = ?").run(
    nextActive,
    nextHash,
    nextPinHash,
    now,
    id,
  );

  if (parsed.data.isActive === false || parsed.data.newPassword) {
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(id);
  }

  return NextResponse.json({
    ok: true,
    account: { id, isActive: nextActive === 1, hasPin: Boolean(nextPinHash) },
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (id === auth.user.id) {
    return NextResponse.json(
      { ok: false, message: "Không thể tự xóa tài khoản quản trị viên đang đăng nhập." },
      { status: 400 },
    );
  }

  const db = getSqliteDb();
  const target = db.prepare("SELECT id, role FROM users WHERE id = ? LIMIT 1").get(id) as
    | { id: string; role: string }
    | undefined;

  if (!target) {
    return NextResponse.json({ ok: false, message: "Không tìm thấy tài khoản." }, { status: 404 });
  }

  if (target.role === "ADMIN") {
    const adminCount = (
      db.prepare("SELECT count(*) AS c FROM users WHERE role = 'ADMIN'").get() as { c: number }
    ).c;
    if (adminCount <= 1) {
      return NextResponse.json(
        { ok: false, message: "Không thể xóa tài khoản Admin cuối cùng của hệ thống." },
        { status: 400 },
      );
    }
  }

  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(id);
  db.prepare("DELETE FROM users WHERE id = ?").run(id);

  return NextResponse.json({ ok: true });
}
