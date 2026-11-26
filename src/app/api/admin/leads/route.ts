import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { leads, leadStatuses, type LeadStatus } from "@/db/schema";
import { requireAdminApi } from "@/lib/api-auth";

export async function GET(req: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status");

  const db = getDb();
  const validStatus =
    statusParam && (leadStatuses as readonly string[]).includes(statusParam)
      ? (statusParam as LeadStatus)
      : null;

  const rows = validStatus
    ? await db.select().from(leads).where(eq(leads.status, validStatus)).orderBy(desc(leads.createdAt))
    : await db.select().from(leads).orderBy(desc(leads.createdAt));

  return NextResponse.json({ ok: true, leads: rows });
}
