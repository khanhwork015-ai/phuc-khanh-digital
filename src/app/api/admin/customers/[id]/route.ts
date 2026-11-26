import { NextResponse } from "next/server";
import { getSqliteDb } from "@/db/sqlite";
import { updateCustomerSchema } from "@/lib/admin-schemas";
import { requireAdminApi } from "@/lib/api-auth";

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

  const parsed = updateCustomerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? "Dữ liệu cập nhật không hợp lệ." },
      { status: 400 },
    );
  }

  const db = getSqliteDb();
  const current = db.prepare("SELECT * FROM customers WHERE id = ?").get(id) as
    | {
        full_name: string;
        business_name: string;
        phone: string;
        email: string | null;
        fanpage_url: string | null;
        plan: string;
        source: string;
        contract_status: string;
        monthly_fee: number;
        javis_client_slug: string | null;
        notes: string | null;
      }
    | undefined;
  if (!current) {
    return NextResponse.json({ ok: false, message: "Không tìm thấy khách hàng." }, { status: 404 });
  }

  const now = new Date().toISOString();
  try {
    db.prepare(
      `UPDATE customers
       SET full_name = ?, business_name = ?, phone = ?, email = ?, fanpage_url = ?,
           plan = ?, source = ?, contract_status = ?, monthly_fee = ?, javis_client_slug = ?, notes = ?, updated_at = ?
       WHERE id = ?`,
    ).run(
      parsed.data.fullName ?? current.full_name,
      parsed.data.businessName ?? current.business_name,
      parsed.data.phone ?? current.phone,
      parsed.data.email === "" ? null : (parsed.data.email ?? current.email),
      parsed.data.fanpageUrl === "" ? null : (parsed.data.fanpageUrl ?? current.fanpage_url),
      parsed.data.plan ?? current.plan,
      parsed.data.source ?? current.source,
      parsed.data.contractStatus ?? current.contract_status,
      parsed.data.monthlyFee ?? current.monthly_fee,
      parsed.data.javisClientSlug === "" ? null : (parsed.data.javisClientSlug ?? current.javis_client_slug),
      parsed.data.notes === "" ? null : (parsed.data.notes ?? current.notes),
      now,
      id,
    );

    const updated = db
      .prepare(
        `SELECT id, code, javis_client_slug AS javisClientSlug, page_id AS pageId,
         full_name AS fullName, business_name AS businessName, phone, email, fanpage_url AS fanpageUrl,
         plan, source, contract_status AS contractStatus, monthly_fee AS monthlyFee, notes
         FROM customers WHERE id = ?`,
      )
      .get(id);

    return NextResponse.json({ ok: true, customer: updated });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Cập nhật thất bại. Kiểm tra lại slug Javis có bị trùng không." },
      { status: 400 },
    );
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const db = getSqliteDb();
  const res = db.prepare("DELETE FROM customers WHERE id = ?").run(id);
  if (res.changes === 0) {
    return NextResponse.json({ ok: false, message: "Không tìm thấy khách hàng." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
