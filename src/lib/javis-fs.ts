import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { getSqliteDb } from "@/db/sqlite";
import type { ContractStatus } from "@/db/types";
import {
  type BridgePost,
  engineTimeToIso,
  listBridgePosts,
  mapBridgeStatus,
  mediaUrlFor,
} from "@/lib/approval-bridge";
import {
  parseCustomersMarkdown,
  removeCustomerRowInMarkdown,
  upsertCustomerRowInMarkdown,
} from "@/lib/javis-markdown";

export function getJavisFanpagesDir(): string | null {
  const dir = process.env.JAVIS_FANPAGES_DIR?.trim();
  if (!dir || !existsSync(dir)) return null;
  return path.resolve(dir);
}

export async function syncFromJavisLocalDir(): Promise<{
  enabled: boolean;
  customersSynced: number;
  contentSynced: number;
  error?: string;
}> {
  const fanpagesDir = getJavisFanpagesDir();
  if (!fanpagesDir) {
    return { enabled: false, customersSynced: 0, contentSynced: 0 };
  }

  const db = getSqliteDb();
  const now = new Date().toISOString();
  let customersSynced = 0;
  let contentSynced = 0;

  const customersFile = path.join(fanpagesDir, "_khach-hang.md");
  const nameToSlug = new Map<string, string>();
  const slugToCustomerId = new Map<string, string>();

  if (existsSync(customersFile)) {
    const parsedCustomers = parseCustomersMarkdown(readFileSync(customersFile, "utf8"));
    for (const item of parsedCustomers) {
      nameToSlug.set(item.businessName.toLowerCase(), item.slug);
      const existing = db
        .prepare("SELECT id FROM customers WHERE javis_client_slug = ? LIMIT 1")
        .get(item.slug) as { id: string } | undefined;

      const combinedNotes = [item.contractSummary, item.notes].filter(Boolean).join(" · ");

      if (existing) {
        db.prepare(
          `UPDATE customers
           SET business_name = ?, page_id = ?, contract_status = ?, notes = ?, updated_at = ?
           WHERE id = ?`,
        ).run(item.businessName, item.pageId || null, item.contractStatus, combinedNotes || null, now, existing.id);
        slugToCustomerId.set(item.slug, existing.id);
      } else {
        const id = crypto.randomUUID();
        const code = `PKD-${item.slug.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "CLIENT"}`;
        db.prepare(
          `INSERT INTO customers
           (id, code, javis_client_slug, page_id, full_name, business_name, phone, plan, source, contract_status, monthly_fee, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'standard', 'offline_contract', ?, 0, ?, ?, ?)`,
        ).run(
          id,
          code,
          item.slug,
          item.pageId || null,
          item.businessName,
          item.businessName,
          "Chưa cập nhật",
          item.contractStatus,
          combinedNotes || null,
          now,
          now,
        );
        slugToCustomerId.set(item.slug, id);
      }
      customersSynced++;
    }
  }

  const allDbCustomers = db
    .prepare("SELECT id, javis_client_slug, business_name FROM customers")
    .all() as Array<{ id: string; javis_client_slug: string | null; business_name: string }>;

  for (const row of allDbCustomers) {
    if (row.javis_client_slug) {
      slugToCustomerId.set(row.javis_client_slug, row.id);
      nameToSlug.set(row.business_name.toLowerCase(), row.javis_client_slug);
    }
  }

  // Posts: the frontmatter of each `bai-nhap/*.md` is the source of truth (read via the approval engine).
  let posts: BridgePost[] = [];
  try {
    posts = await listBridgePosts();
  } catch (err) {
    console.error("[javis-fs] list posts failed:", err);
    return { enabled: true, customersSynced, contentSynced, error: "Không đọc được danh sách bài từ Javis." };
  }
  const seen = new Set<string>();
  for (const post of posts) {
    const status = mapBridgeStatus(post.status);
    const customerId = slugToCustomerId.get(post.fanpage_slug);
    if (!status || !customerId) continue;
    seen.add(post.file);

    const mediaUrlsJson = JSON.stringify(post.images.map(mediaUrlFor));
    const scheduledAt = engineTimeToIso(post.publish_at || post.scheduled_at);
    const publishedAt = engineTimeToIso(post.published_at);
    const feedback = post.feedback || post.schedule_error || null;

    const existingItem = db
      .prepare("SELECT id FROM content_items WHERE javis_item_id = ? LIMIT 1")
      .get(post.file) as { id: string } | undefined;

    if (existingItem) {
      db.prepare(
        `UPDATE content_items
         SET customer_id = ?, title = ?, caption = ?, media_urls = ?, status = ?, client_feedback = ?,
             scheduled_at = ?, published_at = ?, updated_at = ?
         WHERE id = ?`,
      ).run(customerId, post.title, post.body, mediaUrlsJson, status, feedback, scheduledAt, publishedAt, now, existingItem.id);
    } else {
      db.prepare(
        `INSERT INTO content_items
         (id, customer_id, javis_item_id, title, caption, media_type, media_urls, status, client_feedback, scheduled_at, published_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        crypto.randomUUID(),
        customerId,
        post.file,
        post.title,
        post.body,
        post.images.length ? "image" : "text",
        mediaUrlsJson,
        status,
        feedback,
        scheduledAt,
        publishedAt,
        now,
      );
    }
    contentSynced++;
  }

  // Drop rows whose post file is gone (or rows from the old `_cho-duyet.md` keying by code).
  const allRows = db.prepare("SELECT id, javis_item_id FROM content_items").all() as Array<{ id: string; javis_item_id: string }>;
  for (const row of allRows) {
    if (!seen.has(row.javis_item_id)) db.prepare("DELETE FROM content_items WHERE id = ?").run(row.id);
  }

  return { enabled: true, customersSynced, contentSynced };
}

export function upsertCustomerToJavisMarkdown(customer: {
  slug: string;
  businessName: string;
  pageId?: string | null;
  contractStatus: ContractStatus;
  contractSummary?: string | null;
  notes?: string | null;
}): boolean {
  const fanpagesDir = getJavisFanpagesDir();
  if (!fanpagesDir) return false;

  const customersFile = path.join(fanpagesDir, "_khach-hang.md");
  if (!existsSync(customersFile)) return false;

  const raw = readFileSync(customersFile, "utf8");
  const result = upsertCustomerRowInMarkdown(raw, customer);
  if (result.updated) {
    writeFileSync(customersFile, result.content, "utf8");
  }
  return result.updated;
}

export function removeCustomerFromJavisMarkdown(slug: string): boolean {
  const fanpagesDir = getJavisFanpagesDir();
  if (!fanpagesDir) return false;

  const customersFile = path.join(fanpagesDir, "_khach-hang.md");
  if (!existsSync(customersFile)) return false;

  const raw = readFileSync(customersFile, "utf8");
  const result = removeCustomerRowInMarkdown(raw, slug);
  if (result.removed) {
    writeFileSync(customersFile, result.content, "utf8");
  }
  return result.removed;
}
