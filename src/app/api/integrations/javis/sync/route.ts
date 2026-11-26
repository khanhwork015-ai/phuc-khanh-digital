import { NextResponse } from "next/server";
import { getSqliteDb } from "@/db/sqlite";
import { verifyJavisSyncKey } from "@/lib/api-auth";
import { syncFromJavisLocalDir } from "@/lib/javis-fs";

export async function GET(req: Request) {
  if (!verifyJavisSyncKey(req)) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const db = getSqliteDb();
  const unsyncedLeads = db.prepare("SELECT * FROM leads WHERE synced_to_javis = 0").all();
  const clientDecisions = db
    .prepare(
      `SELECT ci.id, ci.javis_item_id AS javisItemId, c.javis_client_slug AS javisClientSlug,
              ci.status, ci.client_feedback AS clientFeedback, ci.updated_at AS updatedAt
       FROM content_items ci
       INNER JOIN customers c ON ci.customer_id = c.id
       WHERE ci.status IN ('approved', 'changes_requested')`,
    )
    .all();

  return NextResponse.json({ ok: true, unsyncedLeads, clientDecisions });
}

export async function POST(req: Request) {
  if (!verifyJavisSyncKey(req)) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const result = await syncFromJavisLocalDir();
  return NextResponse.json({ ok: true, ...result });
}
