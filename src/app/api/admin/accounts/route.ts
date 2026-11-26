import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { customers, users } from "@/db/schema";
import { requireAdminApi } from "@/lib/api-auth";
import { hashPassword } from "@/lib/auth";
import { createCustomerAccountSchema } from "@/lib/auth-schema";

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const db = getDb();
  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      role: users.role,
      isActive: users.isActive,
      customerId: users.customerId,
      customerName: customers.businessName,
      customerCode: customers.code,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .leftJoin(customers, eq(users.customerId, customers.id))
    .orderBy(desc(users.createdAt));

  return NextResponse.json({ ok: true, accounts: rows });
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

  const db = getDb();
  const [customer] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.id, parsed.data.customerId))
    .limit(1);

  if (!customer) {
    return NextResponse.json({ ok: false, message: "Khách hàng liên kết không tồn tại." }, { status: 404 });
  }

  try {
    const [created] = await db
      .insert(users)
      .values({
        username: parsed.data.username,
        passwordHash: hashPassword(parsed.data.password),
        role: "CUSTOMER",
        isActive: true,
        customerId: parsed.data.customerId,
      })
      .returning({
        id: users.id,
        username: users.username,
        role: users.role,
        isActive: users.isActive,
        customerId: users.customerId,
        createdAt: users.createdAt,
      });

    return NextResponse.json({ ok: true, account: created }, { status: 201 });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Tên đăng nhập đã tồn tại. Vui lòng chọn tên khác." },
      { status: 409 },
    );
  }
}
