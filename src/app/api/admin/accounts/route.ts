import { NextResponse } from "next/server";
import { getSqliteDb } from "@/db/sqlite";
import { requireAdminApi, requireDashboardReadApi } from "@/lib/api-auth";
import { hashPassword } from "@/lib/auth";
import { createAccountSchema } from "@/lib/auth-schema";

export async function GET() {
  const auth = await requireDashboardReadApi();
  if (!auth.ok) return auth.response;

  const db = getSqliteDb();
  const rows = db
    .prepare(
      `SELECT u.id, u.username, u.role, u.is_active AS isActiveRaw, u.pin_hash AS pinHashRaw, u.customer_id AS customerId,
              c.business_name AS customerName, c.code AS customerCode, u.last_login_at AS lastLoginAt
       FROM users u
       LEFT JOIN customers c ON u.customer_id = c.id
       ORDER BY u.created_at DESC`,
    )
    .all() as Array<{
    id: string;
    username: string;
    role: string;
    isActiveRaw: number;
    pinHashRaw: string | null;
    customerId: string | null;
    customerName: string | null;
    customerCode: string | null;
    lastLoginAt: string | null;
  }>;

  const accounts = rows.map((r) => ({
    id: r.id,
    username: r.username,
    role: r.role,
    isActive: r.isActiveRaw === 1,
    hasPin: Boolean(r.pinHashRaw),
    customerId: r.customerId,
    customerName: r.customerName,
    customerCode: r.customerCode,
    lastLoginAt: r.lastLoginAt,
  }));

  return NextResponse.json({ ok: true, accounts });
}

export async function POST(req: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const parsed = createAccountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? "Thông tin tài khoản không hợp lệ." },
      { status: 400 },
    );
  }

  const db = getSqliteDb();
  const linkedCustomerId = parsed.data.role === "CUSTOMER" ? parsed.data.customerId || null : null;

  if (linkedCustomerId) {
    const customer = db.prepare("SELECT id FROM customers WHERE id = ? LIMIT 1").get(linkedCustomerId);
    if (!customer) {
      return NextResponse.json({ ok: false, message: "Khách hàng liên kết không tồn tại." }, { status: 404 });
    }
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  try {
    db.prepare(
      `INSERT INTO users (id, username, password_hash, role, is_active, customer_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, ?, ?, ?)`,
    ).run(id, parsed.data.username, hashPassword(parsed.data.password), parsed.data.role, linkedCustomerId, now, now);

    return NextResponse.json(
      {
        ok: true,
        account: {
          id,
          username: parsed.data.username,
          role: parsed.data.role,
          isActive: true,
          customerId: linkedCustomerId,
        },
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { ok: false, message: "Tên đăng nhập đã tồn tại. Vui lòng chọn tên khác." },
      { status: 409 },
    );
  }
}
