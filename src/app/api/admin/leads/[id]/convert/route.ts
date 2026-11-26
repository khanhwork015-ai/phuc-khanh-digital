import { NextResponse } from "next/server";
import { getSqliteDb } from "@/db/sqlite";
import { convertLeadSchema } from "@/lib/admin-schemas";
import { requireAdminApi } from "@/lib/api-auth";
import { upsertCustomerToJavisMarkdown } from "@/lib/javis-fs";
import { leadPlanLabels, type LeadPlanValue } from "@/lib/lead-fields";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const parsed = convertLeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? "Dữ liệu chuyển đổi không hợp lệ." },
      { status: 400 },
    );
  }

  const db = getSqliteDb();
  const lead = db.prepare("SELECT * FROM leads WHERE id = ? LIMIT 1").get(id) as
    | {
        id: string;
        full_name: string;
        phone: string;
        fanpage_url: string;
        plan: string;
        note: string | null;
        converted_customer_id: string | null;
      }
    | undefined;

  if (!lead) {
    return NextResponse.json({ ok: false, message: "Không tìm thấy Lead." }, { status: 404 });
  }
  if (lead.converted_customer_id) {
    return NextResponse.json({ ok: false, message: "Lead này đã được chuyển đổi trước đó." }, { status: 409 });
  }

  const customerId = crypto.randomUUID();
  const code = `PKD-${Date.now().toString(36).toUpperCase().slice(-6)}`;
  const now = new Date().toISOString();
  const slug =
    parsed.data.javisClientSlug ||
    parsed.data.businessName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") ||
    code.toLowerCase();

  try {
    db.exec("BEGIN");
    db.prepare(
      `INSERT INTO customers
       (id, code, javis_client_slug, full_name, business_name, phone, fanpage_url, plan, source, contract_status, monthly_fee, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'online_lead', 'active', ?, ?, ?, ?)`,
    ).run(
      customerId,
      code,
      slug,
      lead.full_name,
      parsed.data.businessName,
      lead.phone,
      lead.fanpage_url || null,
      lead.plan,
      parsed.data.monthlyFee,
      lead.note || null,
      now,
      now,
    );

    db.prepare("UPDATE leads SET status = 'converted', converted_customer_id = ?, updated_at = ? WHERE id = ?").run(
      customerId,
      now,
      id,
    );
    db.exec("COMMIT");

    upsertCustomerToJavisMarkdown({
      slug,
      businessName: parsed.data.businessName,
      contractStatus: "active",
      contractSummary: leadPlanLabels[lead.plan as LeadPlanValue] ?? lead.plan,
      notes: lead.note || null,
    });
  } catch (err) {
    db.exec("ROLLBACK");
    console.error("[convert-lead] Lỗi:", err);
    return NextResponse.json(
      { ok: false, message: "Không thể chuyển đổi Lead (kiểm tra trùng slug Javis)." },
      { status: 400 },
    );
  }

  const updatedLead = db
    .prepare(
      `SELECT id, full_name AS fullName, phone, fanpage_url AS fanpageUrl, plan, status, note,
       synced_to_javis AS syncedToJavis, converted_customer_id AS convertedCustomerId, created_at AS createdAt
       FROM leads WHERE id = ?`,
    )
    .get(id);

  return NextResponse.json({ ok: true, lead: updatedLead }, { status: 201 });
}
