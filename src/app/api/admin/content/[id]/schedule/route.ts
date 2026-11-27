import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSqliteDb } from "@/db/sqlite";
import { requireAdminApi } from "@/lib/api-auth";
import { invalidateBridgeCache } from "@/lib/approval-bridge";
import { getJavisFanpagesDir } from "@/lib/javis-fs";
import { updatePostFrontmatterSchedule } from "@/lib/javis-markdown";

const scheduleSchema = z.union([
  z.object({ auto: z.literal(true) }),
  z.object({ scheduledAt: z.string().min(10).max(40) }),
]);

function formatLocalSchedule(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function slotKey(d: Date): string {
  return formatLocalSchedule(d);
}

function pickNextAutoSlot(existingDates: string[]): Date {
  const taken = new Set(
    existingDates
      .map((iso) => new Date(iso))
      .filter((d) => !Number.isNaN(d.getTime()))
      .map(slotKey),
  );

  const minTime = Date.now() + 2 * 60 * 60 * 1000;
  const cursor = new Date();
  cursor.setSeconds(0, 0);

  for (let dayOffset = 0; dayOffset < 60; dayOffset++) {
    for (const hour of [14, 20]) {
      const candidate = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + dayOffset, hour, 0, 0, 0);
      if (candidate.getTime() < minTime) continue;
      if (!taken.has(slotKey(candidate))) return candidate;
    }
  }
  return new Date(minTime);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const parsed = scheduleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Thời gian lịch đăng không hợp lệ." }, { status: 400 });
  }

  const db = getSqliteDb();
  const existing = db
    .prepare("SELECT id, customer_id AS customerId, javis_item_id AS file FROM content_items WHERE id = ? LIMIT 1")
    .get(id) as { id: string; customerId: string; file: string } | undefined;

  if (!existing) {
    return NextResponse.json({ ok: false, message: "Không tìm thấy bài viết." }, { status: 404 });
  }

  let targetDate: Date;
  if ("auto" in parsed.data) {
    const rows = db
      .prepare("SELECT scheduled_at AS scheduledAt FROM content_items WHERE customer_id = ? AND id != ? AND scheduled_at IS NOT NULL")
      .all(existing.customerId, existing.id) as Array<{ scheduledAt: string }>;
    targetDate = pickNextAutoSlot(rows.map((r) => r.scheduledAt));
  } else {
    const parsedDate = new Date(parsed.data.scheduledAt);
    if (Number.isNaN(parsedDate.getTime())) {
      return NextResponse.json({ ok: false, message: "Định dạng ngày giờ không hợp lệ." }, { status: 400 });
    }
    targetDate = parsedDate;
  }

  const localText = formatLocalSchedule(targetDate);
  const isoText = targetDate.toISOString();
  const now = new Date().toISOString();

  const fanpagesDir = getJavisFanpagesDir();
  if (fanpagesDir) {
    const postPath = path.isAbsolute(existing.file)
      ? existing.file
      : path.resolve(fanpagesDir, existing.file);
    if (existsSync(postPath)) {
      const raw = readFileSync(postPath, "utf8");
      writeFileSync(postPath, updatePostFrontmatterSchedule(raw, localText), "utf8");
      invalidateBridgeCache();
    }
  }

  db.prepare("UPDATE content_items SET scheduled_at = ?, updated_at = ? WHERE id = ?").run(isoText, now, existing.id);

  return NextResponse.json({
    ok: true,
    scheduledAt: isoText,
    message: `Đã hẹn lịch đăng lúc ${localText}.`,
  });
}
