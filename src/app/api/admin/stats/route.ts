import { count, desc, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { contentItems, customers, leads } from "@/db/schema";
import { requireAdminApi } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const db = getDb();

  const [
    totalCustomersRow,
    activeCustomersRow,
    totalLeadsRow,
    newLeadsRow,
    convertedLeadsRow,
    pendingContentRow,
    monthlyRevenueRow,
    planBreakdown,
    recentLeads,
  ] = await Promise.all([
    db.select({ value: count() }).from(customers),
    db.select({ value: count() }).from(customers).where(eq(customers.contractStatus, "active")),
    db.select({ value: count() }).from(leads),
    db.select({ value: count() }).from(leads).where(eq(leads.status, "new")),
    db.select({ value: count() }).from(leads).where(eq(leads.status, "converted")),
    db.select({ value: count() }).from(contentItems).where(eq(contentItems.status, "pending_client")),
    db
      .select({ value: sql<number>`coalesce(sum(${customers.monthlyFee}), 0)::int` })
      .from(customers)
      .where(eq(customers.contractStatus, "active")),
    db
      .select({ plan: customers.plan, total: count() })
      .from(customers)
      .groupBy(customers.plan),
    db.select().from(leads).orderBy(desc(leads.createdAt)).limit(5),
  ]);

  const totalLeads = totalLeadsRow[0]?.value ?? 0;
  const convertedLeads = convertedLeadsRow[0]?.value ?? 0;
  const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

  return NextResponse.json({
    ok: true,
    stats: {
      totalCustomers: totalCustomersRow[0]?.value ?? 0,
      activeCustomers: activeCustomersRow[0]?.value ?? 0,
      totalLeads,
      newLeads: newLeadsRow[0]?.value ?? 0,
      convertedLeads,
      conversionRate,
      pendingClientContent: pendingContentRow[0]?.value ?? 0,
      monthlyRevenue: monthlyRevenueRow[0]?.value ?? 0,
      planBreakdown,
    },
    recentLeads,
  });
}
