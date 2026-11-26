import { NextResponse } from "next/server";
import { getSqliteDb } from "@/db/sqlite";
import { leadPlanLabels, type LeadFormValues } from "@/lib/lead-fields";
import { leadSchema } from "@/lib/lead-schema";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";

const isRateLimited = createRateLimiter(10 * 60 * 1000, 5);

async function postJsonWithTimeout(url: string, body: unknown, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    return res.ok;
  } finally {
    clearTimeout(timer);
  }
}

/** Trả về số kênh đã cấu hình và số kênh gửi thành công. */
async function dispatchNotifications(lead: LeadFormValues): Promise<{ configured: number; delivered: number }> {
  const submittedAt = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  const planName = leadPlanLabels[lead.plan];
  const textLines = [
    "LEAD TƯ VẤN MỚI - PHÚC KHÁNH DIGITAL",
    `- Họ tên: ${lead.fullName}`,
    `- SĐT / Zalo: ${lead.phone}`,
    `- Gói quan tâm: ${planName}`,
    `- Fanpage: ${lead.fanpageUrl || "(Chưa cung cấp)"}`,
    `- Thời gian: ${submittedAt}`,
  ].join("\n");

  const tasks: Promise<boolean>[] = [];

  const tgToken = process.env.TELEGRAM_BOT_TOKEN;
  const tgChatId = process.env.TELEGRAM_CHAT_ID;
  if (tgToken && tgChatId) {
    tasks.push(
      postJsonWithTimeout(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
        chat_id: tgChatId,
        text: textLines,
      }),
    );
  }

  const webhookUrls = [
    process.env.ZALO_WEBHOOK_URL,
    process.env.GOOGLE_SHEETS_WEBHOOK_URL,
    process.env.LEAD_WEBHOOK_URL,
  ].filter((u): u is string => Boolean(u));

  for (const url of webhookUrls) {
    tasks.push(
      postJsonWithTimeout(url, {
        source: "phuc-khanh-digital-landing",
        fullName: lead.fullName,
        phone: lead.phone,
        fanpageUrl: lead.fanpageUrl,
        plan: lead.plan,
        planLabel: planName,
        submittedAt,
        message: textLines,
      }),
    );
  }

  const localIngestUrl = process.env.LOCAL_DASHBOARD_WEBHOOK_URL;
  const syncKey = process.env.JAVIS_SYNC_API_KEY;
  if (localIngestUrl && syncKey) {
    tasks.push(
      (async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        try {
          const res = await fetch(localIngestUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${syncKey}`,
            },
            body: JSON.stringify(lead),
            signal: controller.signal,
          });
          return res.ok;
        } finally {
          clearTimeout(timer);
        }
      })(),
    );
  }

  if (tasks.length === 0) return { configured: 0, delivered: 0 };
  const results = await Promise.allSettled(tasks);
  const delivered = results.filter((r) => r.status === "fulfilled" && r.value).length;
  return { configured: tasks.length, delivered };
}

export async function POST(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Dữ liệu gửi lên không hợp lệ." }, { status: 400 });
  }

  const parsed = leadSchema.safeParse(payload);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    // Lỗi sai kiểu dữ liệu (thiếu trường, gửi mảng...) dùng câu tiếng Việt chung thay vì thông báo mặc định tiếng Anh của Zod
    const message =
      !firstIssue || firstIssue.code === "invalid_type"
        ? "Vui lòng điền đủ họ tên, số điện thoại và gói quan tâm."
        : firstIssue.message;
    return NextResponse.json(
      { ok: false, message },
      { status: 400 },
    );
  }

  // Honeypot: nếu bot điền ô ẩn website thì giả lập thành công nhưng bỏ qua gửi thông báo.
  if (parsed.data.website.trim().length > 0) {
    return NextResponse.json({ ok: true, message: "Đã ghi nhận thông tin tư vấn." });
  }

  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { ok: false, message: "Bạn gửi quá nhiều lần trong ít phút. Vui lòng thử lại sau hoặc nhắn Zalo trực tiếp." },
      { status: 429 },
    );
  }

  let savedToDb = false;
  try {
    const db = getSqliteDb();
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO leads (id, full_name, phone, fanpage_url, plan, status, synced_to_javis, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'new', 0, ?, ?)`,
    ).run(
      crypto.randomUUID(),
      parsed.data.fullName,
      parsed.data.phone,
      parsed.data.fanpageUrl,
      parsed.data.plan,
      now,
      now,
    );
    savedToDb = true;
  } catch (err) {
    console.error("[leads] Lỗi lưu lead vào SQLite:", err);
  }

  const { configured, delivered } = await dispatchNotifications(parsed.data);

  if (!savedToDb && configured === 0) {
    console.warn("[leads] Chưa cấu hình DATABASE_URL và kênh nhận thông báo.");
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { ok: false, message: "Hệ thống nhận đăng ký đang bảo trì. Bạn nhắn Zalo trực tiếp giúp đội ngũ nhé." },
        { status: 503 },
      );
    }
  } else if (!savedToDb && delivered === 0) {
    console.error(`[leads] Gửi lead thất bại ở cả ${configured} kênh và chưa lưu được DB.`);
    return NextResponse.json(
      { ok: false, message: "Chưa gửi được thông tin lúc này. Bạn thử lại sau ít phút hoặc nhắn Zalo trực tiếp nhé." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Đã nhận yêu cầu tư vấn. Đội ngũ sẽ liên hệ với bạn trong giờ làm việc.",
  });
}
