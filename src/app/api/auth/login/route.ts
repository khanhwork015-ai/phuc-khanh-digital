import { NextResponse } from "next/server";
import { getSqliteDb } from "@/db/sqlite";
import type { UserRole } from "@/db/types";
import { buildSessionCookieOptions, createSession, hashPassword, verifyPassword } from "@/lib/auth";
import { isLegacyPasswordHash } from "@/lib/password";
import { loginSchema } from "@/lib/auth-schema";
import { isDashboardRole } from "@/lib/permissions";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";

const isLoginRateLimited = createRateLimiter(10 * 60 * 1000, 10);

export async function POST(req: Request) {
  const ip = getClientIp(req);
  if (isLoginRateLimited(ip)) {
    return NextResponse.json(
      { ok: false, message: "Bạn thử đăng nhập quá nhiều lần. Vui lòng đợi vài phút rồi thử lại." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Dữ liệu đăng nhập không hợp lệ." }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { ok: false, message: issue?.message ?? "Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu." },
      { status: 400 },
    );
  }

  const { username, password } = parsed.data;
  const db = getSqliteDb();

  const user = db
    .prepare(
      `SELECT id, username, password_hash, role, is_active, customer_id
       FROM users WHERE username = ? LIMIT 1`,
    )
    .get(username) as
    | {
        id: string;
        username: string;
        password_hash: string;
        role: UserRole;
        is_active: number;
        customer_id: string | null;
      }
    | undefined;

  if (!user || !verifyPassword(password, user.password_hash)) {
    return NextResponse.json(
      { ok: false, message: "Tên đăng nhập hoặc mật khẩu không chính xác." },
      { status: 401 },
    );
  }

  if (user.is_active !== 1) {
    return NextResponse.json(
      { ok: false, message: "Tài khoản này đang bị tạm khóa. Vui lòng liên hệ quản trị viên." },
      { status: 403 },
    );
  }

  const { token, expiresAt } = createSession(user.id);
  const now = new Date().toISOString();
  db.prepare("UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?").run(now, now, user.id);
  if (isLegacyPasswordHash(user.password_hash)) {
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(password), user.id);
  }

  const redirectTo = isDashboardRole(user.role) ? "/dashboard" : "/portal";
  const response = NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      customerId: user.customer_id,
    },
    redirectTo,
  });

  response.cookies.set({
    ...buildSessionCookieOptions(expiresAt),
    value: token,
  });

  return response;
}
