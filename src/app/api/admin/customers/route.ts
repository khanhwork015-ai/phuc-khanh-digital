import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { customers } from "@/db/schema";
import { createCustomerSchema } from "@/lib/admin-schemas";
import { requireAdminApi } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const db = getDb();
  const rows = await db.select().from(customers).orderBy(desc(customers.createdAt));
  return NextResponse.json({ ok: true, customers: rows });
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

  const parsed = createCustomerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? "Dữ liệu khách hàng không hợp lệ." },
      { status: 400 },
    );
  }

  const code = `PKD-${Date.now().toString(36).toUpperCase().slice(-6)}`;
  const db = getDb();

  try {
    const [created] = await db
      .insert(customers)
      .values({
        code,
        fullName: parsed.data.fullName,
        businessName: parsed.data.businessName,
        phone: parsed.data.phone,
        email: parsed.data.email || null,
        fanpageUrl: parsed.data.fanpageUrl || null,
        plan: parsed.data.plan,
        source: parsed.data.source,
        contractStatus: parsed.data.contractStatus,
        monthlyFee: parsed.data.monthlyFee,
        javisClientSlug: parsed.data.javisClientSlug || null,
        notes: parsed.data.notes || null,
      })
      .returning();

    return NextResponse.json({ ok: true, customer: created }, { status: 201 });
  } catch (err) {
    console.error("[customers] Lỗi tạo khách hàng:", err);
    return NextResponse.json(
      { ok: false, message: "Không thể tạo khách hàng. Kiểm tra lại slug Javis có bị trùng không." },
      { status: 400 },
    );
  }
}
