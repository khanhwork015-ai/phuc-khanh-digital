import { NextResponse } from "next/server";
import { getSqliteDb } from "@/db/sqlite";
import { requireAdminApi } from "@/lib/api-auth";
import { hashPassword } from "@/lib/auth";
import { createCustomerAccountSchema } from "@/lib/auth-schema";

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const db = getSqliteDb();
  const rows = db
    .prepare(
      `SELECT u.id, u.username, u.role, u.is_active AS isActiveRaw, u.customer_id AS customerId,
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
    customerId: string | null;
    customerName: string | null;
    customerCode: string | null;
    lastLoginAt: string | null;
  }>;

  const accounts = rows.map((r) => ({
    ...r,
    isActive: r.isActiveRaw === 1,
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

  const parsed = createCustomerAccountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? "Thông tin tài khoản không hợp lệ." },
      { status: 400 },
    );
  }

  const db = getSqliteDb();
  const customer = db
    .prepare("SELECT id FROM customers WHERE id = ? LIMIT 1")
    .get(parsed.data.customerId);

  if (!customer) {
    return NextResponse.json({ ok: false, message: "Khách hàng liên kết không tồn tại." }, { status: 404 });
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  try {
    db.prepare(
      `INSERT INTO users (id, username, password_hash, role, is_active, customer_id, created_at, updated_at)
       VALUES (?, ?, ?, 'CUSTOMER', 1, ?, ?, ?)`,
    ).run(id, parsed.data.username, hashPassword(parsed.data.password), parsed.data.customerId, now, now);

    return NextResponse.json(
      {
        ok: true,
        account: {
          id,
          username: parsed.data.username,
          role: "CUSTOMER",
          isActive: true,
          customerId: parsed.data.customerId,
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
