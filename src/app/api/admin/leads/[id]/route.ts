import { NextResponse } from "next/server";
import { getSqliteDb } from "@/db/sqlite";
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

  const db = getSqliteDb();
  const existing = db.prepare("SELECT id, status, note FROM leads WHERE id = ?").get(id) as
    | { id: string; status: string; note: string | null }
    | undefined;
  if (!existing) {
    return NextResponse.json({ ok: false, message: "Không tìm thấy Lead." }, { status: 404 });
  }

  const now = new Date().toISOString();
  db.prepare("UPDATE leads SET status = ?, note = ?, updated_at = ? WHERE id = ?").run(
    parsed.data.status ?? existing.status,
    parsed.data.note !== undefined ? parsed.data.note : existing.note,
    now,
    id,
  );

  const updated = db
    .prepare(
      `SELECT id, full_name AS fullName, phone, fanpage_url AS fanpageUrl, plan, status, note,
       synced_to_javis AS syncedToJavis, converted_customer_id AS convertedCustomerId, created_at AS createdAt
       FROM leads WHERE id = ?`,
    )
    .get(id);

  return NextResponse.json({ ok: true, lead: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const db = getSqliteDb();
  const res = db.prepare("DELETE FROM leads WHERE id = ?").run(id);
  if (res.changes === 0) {
    return NextResponse.json({ ok: false, message: "Không tìm thấy Lead." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
