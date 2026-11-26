import { NextResponse } from "next/server";
import { getSqliteDb } from "@/db/sqlite";
import { createCustomerSchema } from "@/lib/admin-schemas";
import { requireCustomerManageApi, requireDashboardReadApi } from "@/lib/api-auth";
import { syncFromJavisLocalDir } from "@/lib/javis-fs";

const selectCols = `
  id,
  code,
  javis_client_slug AS javisClientSlug,
  page_id AS pageId,
  full_name AS fullName,
  business_name AS businessName,
  phone,
  email,
  fanpage_url AS fanpageUrl,
  plan,
  source,
  contract_status AS contractStatus,
  monthly_fee AS monthlyFee,
  notes
`;

export async function GET() {
  const auth = await requireDashboardReadApi();
  if (!auth.ok) return auth.response;

  syncFromJavisLocalDir();
  const db = getSqliteDb();
  const rows = db.prepare(`SELECT ${selectCols} FROM customers ORDER BY created_at DESC`).all();
  return NextResponse.json({ ok: true, customers: rows });
}

export async function POST(req: Request) {
  const auth = await requireCustomerManageApi();
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

  const db = getSqliteDb();
  const id = crypto.randomUUID();
  const code = `PKD-${Date.now().toString(36).toUpperCase().slice(-6)}`;
  const now = new Date().toISOString();

  try {
    db.prepare(
      `INSERT INTO customers
       (id, code, javis_client_slug, full_name, business_name, phone, email, fanpage_url, plan, source, contract_status, monthly_fee, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      code,
      parsed.data.javisClientSlug || null,
      parsed.data.fullName,
      parsed.data.businessName,
      parsed.data.phone,
      parsed.data.email || null,
      parsed.data.fanpageUrl || null,
      parsed.data.plan,
      parsed.data.source,
      parsed.data.contractStatus,
      parsed.data.monthlyFee,
      parsed.data.notes || null,
      now,
      now,
    );

    const customer = db.prepare(`SELECT ${selectCols} FROM customers WHERE id = ?`).get(id);
    return NextResponse.json({ ok: true, customer }, { status: 201 });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Không thể tạo khách hàng. Kiểm tra lại slug Javis có bị trùng không." },
      { status: 400 },
    );
  }
}
