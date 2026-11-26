import { NextResponse } from "next/server";
import { getSqliteDb } from "@/db/sqlite";
import { leadStatuses, type LeadStatus } from "@/db/types";
import { requireDashboardReadApi } from "@/lib/api-auth";

const selectCols = `
  id,
  full_name AS fullName,
  phone,
  fanpage_url AS fanpageUrl,
  plan,
  status,
  note,
  synced_to_javis AS syncedToJavis,
  converted_customer_id AS convertedCustomerId,
  created_at AS createdAt
`;

export async function GET(req: Request) {
  const auth = await requireDashboardReadApi();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status");
  const validStatus =
    statusParam && (leadStatuses as readonly string[]).includes(statusParam)
      ? (statusParam as LeadStatus)
      : null;

  const db = getSqliteDb();
  const rows = validStatus
    ? db.prepare(`SELECT ${selectCols} FROM leads WHERE status = ? ORDER BY created_at DESC`).all(validStatus)
    : db.prepare(`SELECT ${selectCols} FROM leads ORDER BY created_at DESC`).all();

  return NextResponse.json({ ok: true, leads: rows });
}
