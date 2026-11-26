import { eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import {
  brandAssets,
  brandAssetTypes,
  contentItems,
  contentMediaTypes,
  contentStatuses,
  contractStatuses,
  customers,
  leads,
} from "@/db/schema";
import { verifyJavisSyncKey } from "@/lib/api-auth";
import { leadPlanValues } from "@/lib/lead-fields";

const syncPayloadSchema = z.object({
  syncedLeadIds: z.array(z.string().uuid()).optional(),
  customers: z
    .array(
      z.object({
        javisClientSlug: z.string().trim().min(1).max(80),
        businessName: z.string().trim().min(1).max(120),
        fullName: z.string().trim().min(1).max(100).optional(),
        phone: z.string().trim().max(20).optional(),
        email: z.string().trim().max(120).optional().nullable(),
        fanpageUrl: z.string().trim().max(300).optional().nullable(),
        plan: z.enum(leadPlanValues).default("standard"),
        contractStatus: z.enum(contractStatuses).default("active"),
        monthlyFee: z.number().int().min(0).default(0),
        notes: z.string().max(2000).optional().nullable(),
      }),
    )
    .optional(),
  brandAssets: z
    .array(
      z.object({
        javisClientSlug: z.string().min(1),
        title: z.string().min(1),
        assetType: z.enum(brandAssetTypes).default("guideline"),
        fileUrl: z.string().url().optional().nullable(),
        metadata: z.record(z.string(), z.unknown()).optional().nullable(),
      }),
    )
    .optional(),
  contentItems: z
    .array(
      z.object({
        javisClientSlug: z.string().min(1),
        javisItemId: z.string().min(1),
        title: z.string().min(1),
        caption: z.string(),
        mediaType: z.enum(contentMediaTypes).default("image"),
        mediaUrls: z.array(z.string()).default([]),
        status: z.enum(contentStatuses).default("pending_client"),
        scheduledAt: z.string().datetime().optional().nullable(),
        publishedAt: z.string().datetime().optional().nullable(),
        publishedUrl: z.string().url().optional().nullable(),
      }),
    )
    .optional(),
});

export async function GET(req: Request) {
  if (!verifyJavisSyncKey(req)) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const [unsyncedLeads, clientDecisions] = await Promise.all([
    db.select().from(leads).where(eq(leads.syncedToJavis, false)),
    db
      .select({
        id: contentItems.id,
        javisItemId: contentItems.javisItemId,
        javisClientSlug: customers.javisClientSlug,
        status: contentItems.status,
        clientFeedback: contentItems.clientFeedback,
        updatedAt: contentItems.updatedAt,
      })
      .from(contentItems)
      .innerJoin(customers, eq(contentItems.customerId, customers.id))
      .where(inArray(contentItems.status, ["approved", "changes_requested"])),
  ]);

  return NextResponse.json({
    ok: true,
    unsyncedLeads,
    clientDecisions,
  });
}

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

  const parsed = syncPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 },
    );
  }

  const db = getDb();
  let upsertedCustomers = 0;

  if (parsed.data.customers) {
    for (const item of parsed.data.customers) {
      const generatedCode = `PKD-${item.javisClientSlug.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "CLIENT"}`;
      await db
        .insert(customers)
        .values({
          code: generatedCode,
          javisClientSlug: item.javisClientSlug,
          businessName: item.businessName,
          fullName: item.fullName ?? item.businessName,
          phone: item.phone ?? "Chưa cập nhật",
          email: item.email ?? null,
          fanpageUrl: item.fanpageUrl ?? null,
          plan: item.plan,
          source: "offline_contract",
          contractStatus: item.contractStatus,
          monthlyFee: item.monthlyFee,
          notes: item.notes ?? null,
        })
        .onConflictDoUpdate({
          target: customers.javisClientSlug,
          set: {
            businessName: item.businessName,
            fullName: item.fullName ?? item.businessName,
            phone: item.phone ?? "Chưa cập nhật",
            email: item.email ?? null,
            fanpageUrl: item.fanpageUrl ?? null,
            plan: item.plan,
            contractStatus: item.contractStatus,
            monthlyFee: item.monthlyFee,
            notes: item.notes ?? null,
            updatedAt: new Date(),
          },
        });
      upsertedCustomers++;
    }
  }

  const clientRows = await db
    .select({ id: customers.id, slug: customers.javisClientSlug })
    .from(customers);
  const slugToId = new Map<string, string>();
  for (const row of clientRows) {
    if (row.slug) slugToId.set(row.slug, row.id);
  }

  if (parsed.data.syncedLeadIds && parsed.data.syncedLeadIds.length > 0) {
    await db
      .update(leads)
      .set({ syncedToJavis: true, updatedAt: new Date() })
      .where(inArray(leads.id, parsed.data.syncedLeadIds));
  }

  let upsertedContent = 0;
  let insertedAssets = 0;

  if (parsed.data.brandAssets) {
    for (const asset of parsed.data.brandAssets) {
      const customerId = slugToId.get(asset.javisClientSlug);
      if (!customerId) continue;
      await db.insert(brandAssets).values({
        customerId,
        title: asset.title,
        assetType: asset.assetType,
        fileUrl: asset.fileUrl ?? null,
        metadata: asset.metadata ?? null,
      });
      insertedAssets++;
    }
  }

  if (parsed.data.contentItems) {
    for (const item of parsed.data.contentItems) {
      const customerId = slugToId.get(item.javisClientSlug);
      if (!customerId) continue;

      await db
        .insert(contentItems)
        .values({
          customerId,
          javisItemId: item.javisItemId,
          title: item.title,
          caption: item.caption,
          mediaType: item.mediaType,
          mediaUrls: item.mediaUrls,
          status: item.status,
          scheduledAt: item.scheduledAt ? new Date(item.scheduledAt) : null,
          publishedAt: item.publishedAt ? new Date(item.publishedAt) : null,
          publishedUrl: item.publishedUrl ?? null,
        })
        .onConflictDoUpdate({
          target: contentItems.javisItemId,
          set: {
            title: item.title,
            caption: item.caption,
            mediaType: item.mediaType,
            mediaUrls: item.mediaUrls,
            status: item.status,
            scheduledAt: item.scheduledAt ? new Date(item.scheduledAt) : null,
            publishedAt: item.publishedAt ? new Date(item.publishedAt) : null,
            publishedUrl: item.publishedUrl ?? null,
            updatedAt: new Date(),
          },
        });
      upsertedContent++;
    }
  }

  return NextResponse.json({
    ok: true,
    upsertedCustomers,
    syncedLeads: parsed.data.syncedLeadIds?.length ?? 0,
    insertedAssets,
    upsertedContent,
  });
}
