import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { getSqliteDb } from "@/db/sqlite";
import type { ContentStatus, ContractStatus } from "@/db/types";
import {
  parseApprovalQueueMarkdown,
  parseCustomersMarkdown,
  removeCustomerRowInMarkdown,
  updateApprovalRowInMarkdown,
  upsertCustomerRowInMarkdown,
} from "@/lib/javis-markdown";

function parseScheduledDate(raw: string): string | null {
  if (!raw || raw === "-") return null;
  const normalized = raw.trim().replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function findClientPostDetail(
  fanpagesDir: string,
  slug: string,
  itemCode: string,
): { caption: string; mediaUrls: string[] } {
  const clientDir = path.join(fanpagesDir, slug);
  if (!existsSync(clientDir)) {
    return { caption: "", mediaUrls: [] };
  }

  let caption = "";
  const mediaUrls: string[] = [];

  try {
    const entries = readdirSync(clientDir, { withFileTypes: true, recursive: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const fullPath = path.join(entry.parentPath, entry.name);
      const relPath = path.relative(fanpagesDir, fullPath).replace(/\\/g, "/");
      const lower = entry.name.toLowerCase();

      if (!lower.includes(itemCode.toLowerCase())) continue;

      if (lower.endsWith(".md") && !caption) {
        caption = readFileSync(fullPath, "utf8").slice(0, 4000);
      } else if (/\.(png|jpe?g|webp|gif|mp4|mov)$/.test(lower)) {
        mediaUrls.push(`/api/local-media?path=${encodeURIComponent(relPath)}`);
      }
    }
  } catch {
    return { caption, mediaUrls };
  }

  return { caption, mediaUrls };
}

export function getJavisFanpagesDir(): string | null {
  const dir = process.env.JAVIS_FANPAGES_DIR?.trim();
  if (!dir || !existsSync(dir)) return null;
  return path.resolve(dir);
}

export function syncFromJavisLocalDir(): {
  enabled: boolean;
  customersSynced: number;
  contentSynced: number;
} {
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

  const queueFile = path.join(fanpagesDir, "_cho-duyet.md");
  if (existsSync(queueFile)) {
    const parsedItems = parseApprovalQueueMarkdown(readFileSync(queueFile, "utf8"));
    for (const item of parsedItems) {
      const slug = nameToSlug.get(item.fanpageName.toLowerCase());
      const customerId = slug ? slugToCustomerId.get(slug) : undefined;
      if (!customerId || !slug) continue;

      const detail = findClientPostDetail(fanpagesDir, slug, item.itemCode);
      const caption = detail.caption || item.title;
      const mediaUrlsJson = JSON.stringify(detail.mediaUrls);
      const scheduledAt = parseScheduledDate(item.scheduledText);

      const existingItem = db
        .prepare("SELECT id FROM content_items WHERE javis_item_id = ? LIMIT 1")
        .get(item.itemCode) as { id: string } | undefined;

      if (existingItem) {
        db.prepare(
          `UPDATE content_items
           SET title = ?, caption = ?, media_urls = ?, status = ?, client_feedback = COALESCE(?, client_feedback), scheduled_at = ?, updated_at = ?
           WHERE id = ?`,
        ).run(
          item.title,
          caption,
          mediaUrlsJson,
          item.status,
          item.notes || null,
          scheduledAt,
          now,
          existingItem.id,
        );
      } else {
        db.prepare(
          `INSERT INTO content_items
           (id, customer_id, javis_item_id, title, caption, media_type, media_urls, status, client_feedback, scheduled_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 'image', ?, ?, ?, ?, ?)`,
        ).run(
          crypto.randomUUID(),
          customerId,
          item.itemCode,
          item.title,
          caption,
          mediaUrlsJson,
          item.status,
          item.notes || null,
          scheduledAt,
          now,
        );
      }
      contentSynced++;
    }
  }

  return { enabled: true, customersSynced, contentSynced };
}

export function writeApprovalDecisionToJavis(
  javisItemId: string,
  nextStatus: ContentStatus,
  feedback?: string | null,
): boolean {
  const fanpagesDir = getJavisFanpagesDir();
  if (!fanpagesDir) return false;

  const queueFile = path.join(fanpagesDir, "_cho-duyet.md");
  if (!existsSync(queueFile)) return false;

  const raw = readFileSync(queueFile, "utf8");
  const result = updateApprovalRowInMarkdown(raw, javisItemId, nextStatus, feedback);
  if (result.updated) {
    writeFileSync(queueFile, result.content, "utf8");
  }
  return result.updated;
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
