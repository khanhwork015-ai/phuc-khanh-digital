import { NextResponse } from "next/server";
import { getSqliteDb } from "@/db/sqlite";
import { requireDashboardReadApi } from "@/lib/api-auth";
import { syncFromJavisLocalDir } from "@/lib/javis-fs";

type CustomerRow = {
  id: string;
  code: string;
  javisClientSlug: string | null;
  pageId: string | null;
  businessName: string;
  contractStatus: string;
  requireCustomerApproval: number;
};

type ContentCountRow = {
  customerId: string;
  status: string;
  total: number;
};

type AccountCountRow = {
  customerId: string;
  total: number;
};

export async function GET() {
  const auth = await requireDashboardReadApi();
  if (!auth.ok) return auth.response;

  const javisSync = await syncFromJavisLocalDir();
  const db = getSqliteDb();

  const customers = db
    .prepare(
      `SELECT
        id,
        code,
        javis_client_slug AS javisClientSlug,
        page_id AS pageId,
        business_name AS businessName,
        contract_status AS contractStatus,
        require_customer_approval AS requireCustomerApproval
       FROM customers
       ORDER BY business_name ASC`,
    )
    .all() as CustomerRow[];

  const contentRows = db
    .prepare(
      `SELECT customer_id AS customerId, status, count(*) AS total
       FROM content_items
       GROUP BY customer_id, status`,
    )
    .all() as ContentCountRow[];

  const accountRows = db
    .prepare(
      `SELECT customer_id AS customerId, count(*) AS total
       FROM users
       WHERE role = 'CUSTOMER' AND is_active = 1 AND customer_id IS NOT NULL
       GROUP BY customer_id`,
    )
    .all() as AccountCountRow[];

  const countsMap = new Map<string, Record<string, number>>();
  for (const row of contentRows) {
    const entry = countsMap.get(row.customerId) ?? {
      pending_review: 0,
      pending_client: 0,
      approved: 0,
      changes_requested: 0,
      scheduled: 0,
      published: 0,
      total: 0,
    };
    entry[row.status] = (entry[row.status] ?? 0) + row.total;
    entry.total += row.total;
    countsMap.set(row.customerId, entry);
  }

  const accountMap = new Map<string, number>();
  for (const row of accountRows) {
    accountMap.set(row.customerId, row.total);
  }

  const fanpages = customers.map((c) => {
    const counts = countsMap.get(c.id) ?? {
      pending_review: 0,
      pending_client: 0,
      approved: 0,
      changes_requested: 0,
      scheduled: 0,
      published: 0,
      total: 0,
    };
    const accountCount = accountMap.get(c.id) ?? 0;
    return {
      ...c,
      accountCount,
      requireCustomerApproval: Boolean(c.requireCustomerApproval) && accountCount > 0,
      counts,
    };
  });

  return NextResponse.json({ ok: true, javisSync, fanpages });
}
