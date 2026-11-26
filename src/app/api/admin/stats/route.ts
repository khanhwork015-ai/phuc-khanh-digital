import { NextResponse } from "next/server";
import { getSqliteDb } from "@/db/sqlite";
import { requireDashboardReadApi } from "@/lib/api-auth";
import { syncFromJavisLocalDir } from "@/lib/javis-fs";

export async function GET() {
  const auth = await requireDashboardReadApi();
  if (!auth.ok) return auth.response;

  const javisSync = await syncFromJavisLocalDir();
  const db = getSqliteDb();

  const totalCustomers = (db.prepare("SELECT count(*) AS c FROM customers").get() as { c: number }).c;
  const activeCustomers = (
    db.prepare("SELECT count(*) AS c FROM customers WHERE contract_status = 'active'").get() as { c: number }
  ).c;
  const totalLeads = (db.prepare("SELECT count(*) AS c FROM leads").get() as { c: number }).c;
  const newLeads = (db.prepare("SELECT count(*) AS c FROM leads WHERE status = 'new'").get() as { c: number }).c;
  const convertedLeads = (
    db.prepare("SELECT count(*) AS c FROM leads WHERE status = 'converted'").get() as { c: number }
  ).c;
  const pendingClientContent = (
    db.prepare("SELECT count(*) AS c FROM content_items WHERE status = 'pending_client'").get() as { c: number }
  ).c;
  const monthlyRevenue = (
    db
      .prepare("SELECT coalesce(sum(monthly_fee), 0) AS total FROM customers WHERE contract_status = 'active'")
      .get() as { total: number }
  ).total;

  const planBreakdown = db
    .prepare("SELECT plan, count(*) AS total FROM customers GROUP BY plan")
    .all() as Array<{ plan: string; total: number }>;

  const recentLeads = db
    .prepare(
      `SELECT id, full_name AS fullName, phone, plan, status, created_at AS createdAt
       FROM leads ORDER BY created_at DESC LIMIT 5`,
    )
    .all();

  const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

  return NextResponse.json({
    ok: true,
    javisSync,
    stats: {
      totalCustomers,
      activeCustomers,
      totalLeads,
      newLeads,
      convertedLeads,
      conversionRate,
      pendingClientContent,
      monthlyRevenue,
      planBreakdown,
    },
    recentLeads,
  });
}
