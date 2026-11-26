import { NextResponse } from "next/server";
import { getSqliteDb } from "@/db/sqlite";
import { verifyJavisSyncKey } from "@/lib/api-auth";
import { leadSchema } from "@/lib/lead-schema";

export async function POST(req: Request) {
  if (!verifyJavisSyncKey(req)) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? "Dữ liệu Lead không hợp lệ." },
      { status: 400 },
    );
  }

  const db = getSqliteDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO leads (id, full_name, phone, fanpage_url, plan, status, synced_to_javis, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'new', 0, ?, ?)`,
  ).run(id, parsed.data.fullName, parsed.data.phone, parsed.data.fanpageUrl, parsed.data.plan, now, now);

  return NextResponse.json({ ok: true, id }, { status: 201 });
}
