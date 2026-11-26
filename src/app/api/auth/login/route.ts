import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { buildSessionCookieOptions, createSession, verifyPassword } from "@/lib/auth";
import { loginSchema } from "@/lib/auth-schema";
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

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { ok: false, message: "Hệ thống chưa được cấu hình cơ sở dữ liệu (DATABASE_URL)." },
      { status: 503 },
    );
  }

  const { username, password } = parsed.data;
  const db = getDb();
  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      passwordHash: users.passwordHash,
      role: users.role,
      isActive: users.isActive,
      customerId: users.customerId,
    })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  const user = rows[0];
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json(
      { ok: false, message: "Tên đăng nhập hoặc mật khẩu không chính xác." },
      { status: 401 },
    );
  }

  if (!user.isActive) {
    return NextResponse.json(
      { ok: false, message: "Tài khoản này đang bị tạm khóa. Vui lòng liên hệ quản trị viên." },
      { status: 403 },
    );
  }

  const { token, expiresAt } = await createSession(user.id);
  await db.update(users).set({ lastLoginAt: new Date(), updatedAt: new Date() }).where(eq(users.id, user.id));

  const redirectTo = user.role === "ADMIN" ? "/dashboard" : "/portal";
  const response = NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      customerId: user.customerId,
    },
    redirectTo,
  });

  response.cookies.set({
    ...buildSessionCookieOptions(expiresAt),
    value: token,
  });

  return response;
}
