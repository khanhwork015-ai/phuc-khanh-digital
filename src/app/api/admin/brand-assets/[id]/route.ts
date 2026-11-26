import { NextResponse } from "next/server";
import { getSqliteDb } from "@/db/sqlite";
import { requireCustomerManageApi } from "@/lib/api-auth";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireCustomerManageApi();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const db = getSqliteDb();
  const res = db.prepare("DELETE FROM brand_assets WHERE id = ?").run(id);
  if (res.changes === 0) {
    return NextResponse.json({ ok: false, message: "Không tìm thấy tài liệu nhận diện." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
