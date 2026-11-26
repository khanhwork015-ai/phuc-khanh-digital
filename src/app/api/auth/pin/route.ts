import { NextResponse } from "next/server";
import { getSqliteDb } from "@/db/sqlite";
import { getSessionUser, hashPassword, verifyPassword } from "@/lib/auth";
import { pinActionSchema } from "@/lib/auth-schema";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";

const isPinRateLimited = createRateLimiter(15 * 60 * 1000, 10);

export async function POST(req: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ ok: false, message: "Phiên đăng nhập đã hết hạn." }, { status: 401 });
  }

  const rateKey = `${sessionUser.id}:${getClientIp(req)}`;
  if (isPinRateLimited(rateKey)) {
    return NextResponse.json(
      { ok: false, message: "Bạn nhập sai mã PIN quá nhiều lần. Vui lòng thử lại sau 15 phút." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const parsed = pinActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? "Mã PIN phải gồm đúng 4 chữ số." },
      { status: 400 },
    );
  }

  const db = getSqliteDb();
  const row = db
    .prepare("SELECT id, pin_hash FROM users WHERE id = ? LIMIT 1")
    .get(sessionUser.id) as { id: string; pin_hash: string | null } | undefined;

  if (!row) {
    return NextResponse.json({ ok: false, message: "Không tìm thấy tài khoản." }, { status: 404 });
  }

  if (!row.pin_hash) {
    if (!parsed.data.confirmPin || parsed.data.confirmPin !== parsed.data.pin) {
      return NextResponse.json(
        { ok: false, message: "Mã PIN xác nhận không khớp." },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    db.prepare("UPDATE users SET pin_hash = ?, updated_at = ? WHERE id = ?").run(
      hashPassword(parsed.data.pin),
      now,
      row.id,
    );

    return NextResponse.json({ ok: true, hasPin: true });
  }

  if (!verifyPassword(parsed.data.pin, row.pin_hash)) {
    return NextResponse.json({ ok: false, message: "Mã PIN không chính xác." }, { status: 401 });
  }

  return NextResponse.json({ ok: true, hasPin: true });
}
