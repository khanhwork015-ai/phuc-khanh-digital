import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { customers } from "@/db/schema";
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

  const db = getDb();
  const payload = {
    ...parsed.data,
    email: parsed.data.email === "" ? null : parsed.data.email,
    fanpageUrl: parsed.data.fanpageUrl === "" ? null : parsed.data.fanpageUrl,
    javisClientSlug: parsed.data.javisClientSlug === "" ? null : parsed.data.javisClientSlug,
    notes: parsed.data.notes === "" ? null : parsed.data.notes,
    updatedAt: new Date(),
  };

  try {
    const [updated] = await db
      .update(customers)
      .set(payload)
      .where(eq(customers.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ ok: false, message: "Không tìm thấy khách hàng." }, { status: 404 });
    }

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
  const db = getDb();
  const [deleted] = await db.delete(customers).where(eq(customers.id, id)).returning({ id: customers.id });
  if (!deleted) {
    return NextResponse.json({ ok: false, message: "Không tìm thấy khách hàng." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
