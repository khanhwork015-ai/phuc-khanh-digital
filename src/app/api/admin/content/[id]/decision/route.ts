import { NextResponse } from "next/server";
import { z } from "zod";
import { getSqliteDb } from "@/db/sqlite";
import { contentStatuses } from "@/db/types";
import { requireAdminApi } from "@/lib/api-auth";
import { writeApprovalDecisionToJavis } from "@/lib/javis-fs";

const adminDecisionSchema = z.object({
  status: z.enum(contentStatuses),
  feedback: z.string().trim().max(1500).optional(),
});

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

  const parsed = adminDecisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." },
      { status: 400 },
    );
  }

  const db = getSqliteDb();
  const existing = db
    .prepare("SELECT id, javis_item_id AS javisItemId FROM content_items WHERE id = ? LIMIT 1")
    .get(id) as { id: string; javisItemId: string } | undefined;

  if (!existing) {
    return NextResponse.json({ ok: false, message: "Không tìm thấy bài viết." }, { status: 404 });
  }

  const now = new Date().toISOString();
  db.prepare("UPDATE content_items SET status = ?, client_feedback = ?, updated_at = ? WHERE id = ?").run(
    parsed.data.status,
    parsed.data.feedback ?? null,
    now,
    id,
  );

  writeApprovalDecisionToJavis(existing.javisItemId, parsed.data.status, parsed.data.feedback);

  return NextResponse.json({ ok: true, status: parsed.data.status });
}
