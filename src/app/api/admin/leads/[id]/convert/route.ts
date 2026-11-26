import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { customers, leads } from "@/db/schema";
import { convertLeadSchema } from "@/lib/admin-schemas";
import { requireAdminApi } from "@/lib/api-auth";

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

  const db = getDb();

  try {
    const result = await db.transaction(async (tx) => {
      const [lead] = await tx.select().from(leads).where(eq(leads.id, id)).limit(1);
      if (!lead) {
        return { error: "Không tìm thấy Lead.", status: 404 as const };
      }
      if (lead.convertedCustomerId) {
        return { error: "Lead này đã được chuyển đổi thành khách hàng trước đó.", status: 409 as const };
      }

      const code = `PKD-${Date.now().toString(36).toUpperCase().slice(-6)}`;
      const [customer] = await tx
        .insert(customers)
        .values({
          code,
          fullName: lead.fullName,
          businessName: parsed.data.businessName,
          phone: lead.phone,
          fanpageUrl: lead.fanpageUrl || null,
          plan: lead.plan,
          source: "online_lead",
          contractStatus: "active",
          monthlyFee: parsed.data.monthlyFee,
          javisClientSlug: parsed.data.javisClientSlug || null,
          notes: lead.note || null,
        })
        .returning();

      const [updatedLead] = await tx
        .update(leads)
        .set({
          status: "converted",
          convertedCustomerId: customer.id,
          updatedAt: new Date(),
        })
        .where(eq(leads.id, id))
        .returning();

      return { customer, lead: updatedLead };
    });

    if ("error" in result) {
      return NextResponse.json({ ok: false, message: result.error }, { status: result.status });
    }

    return NextResponse.json({ ok: true, customer: result.customer, lead: result.lead }, { status: 201 });
  } catch (err) {
    console.error("[convert-lead] Lỗi chuyển đổi lead:", err);
    return NextResponse.json({ ok: false, message: "Không thể chuyển đổi Lead (trùng mã hoặc slug Javis)." }, { status: 400 });
  }
}
