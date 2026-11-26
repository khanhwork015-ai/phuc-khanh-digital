import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { leads } from "@/db/schema";
import { updateLeadSchema } from "@/lib/admin-schemas";
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

  const parsed = updateLeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." },
      { status: 400 },
    );
  }

  const db = getDb();
  const [updated] = await db
    .update(leads)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(leads.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ ok: false, message: "Không tìm thấy Lead." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, lead: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const db = getDb();
  const [deleted] = await db.delete(leads).where(eq(leads.id, id)).returning({ id: leads.id });
  if (!deleted) {
    return NextResponse.json({ ok: false, message: "Không tìm thấy Lead." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
