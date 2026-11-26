import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import type { ContentStatus } from "@/db/types";

const execFileAsync = promisify(execFile);

/**
 * Bridge to the approval engine that already runs the content pipeline
 * (`workspace/tools/approval-ui/server.py`). The post files' frontmatter is the
 * source of truth: approving schedules a Javis publish job, requesting an edit
 * cancels that job and hands the revision (with the reason) to the content bot.
 * This web only renders and calls that engine, so both stay in lockstep.
 */

export type BridgePost = {
  file: string;
  code: string;
  fanpage_slug: string;
  fanpage_name: string;
  fanpage_logo: string | null;
  title: string;
  status: string;
  scheduled_at: string;
  feedback: string;
  feedback_history: string;
  reviewed_at: string;
  admin_approved_at: string;
  admin_approved_by: string;
  customer_approved_at: string;
  customer_approved_by: string;
  edit_requested_by_role: string;
  publish_at: string;
  publish_job_id: string;
  schedule_error: string;
  post_id: string;
  published_at: string;
  images: string[];
  body: string;
};

export type BridgeAction = "approve" | "request_edit" | "retry_schedule";

export type BridgeDecisionResult = {
  ok: boolean;
  message?: string;
  error?: string;
  forbidden?: boolean;
};

const viToStatus: Record<string, ContentStatus> = {
  "Chờ duyệt": "pending_review",
  "Chờ khách duyệt": "pending_client",
  "Đã duyệt": "approved",
  "Sửa lại": "changes_requested",
  "Chờ đăng": "scheduled",
  "Đã đăng": "published",
};

/** Maps the engine's Vietnamese status; `null` means a draft that is not in the review flow yet. */
export function mapBridgeStatus(raw: string): ContentStatus | null {
  return viToStatus[raw] ?? null;
}

export function getApprovalServerPath(): string | null {
  const explicit = process.env.JAVIS_APPROVAL_SERVER?.trim();
  if (explicit) return existsSync(explicit) ? explicit : null;
  const fanpagesDir = process.env.JAVIS_FANPAGES_DIR?.trim();
  if (!fanpagesDir) return null;
  const guess = path.resolve(fanpagesDir, "..", "tools", "approval-ui", "server.py");
  return existsSync(guess) ? guess : null;
}

function pythonBin(): string {
  return process.env.JAVIS_PYTHON?.trim() || "python";
}

async function runEngine(args: string[], timeoutMs = 60_000): Promise<unknown> {
  const script = getApprovalServerPath();
  if (!script) throw new Error("Không tìm thấy server.py của hệ thống duyệt bài (JAVIS_APPROVAL_SERVER).");
  let stdout = "";
  try {
    const res = await execFileAsync(pythonBin(), ["-X", "utf8", script, ...args], {
      timeout: timeoutMs,
      windowsHide: true,
      maxBuffer: 16 * 1024 * 1024,
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    });
    stdout = res.stdout;
  } catch (err) {
    // The engine exits 1 when ok=false but still prints JSON on stdout.
    const out = (err as { stdout?: string }).stdout;
    if (!out) throw err;
    stdout = out;
  }
  return JSON.parse(stdout);
}

let cache: { at: number; posts: BridgePost[] } | null = null;

export async function listBridgePosts(fresh = false): Promise<BridgePost[]> {
  if (!fresh && cache && Date.now() - cache.at < 3000) return cache.posts;
  const data = (await runEngine(["--list-posts"], 30_000)) as { ok?: boolean; posts?: BridgePost[] };
  const posts = Array.isArray(data.posts) ? data.posts : [];
  cache = { at: Date.now(), posts };
  return posts;
}

export function invalidateBridgeCache() {
  cache = null;
}

export async function decideBridgePost(input: {
  file: string;
  action: BridgeAction;
  actorRole: "admin" | "customer";
  actorUsername: string;
  actorName?: string;
  actorFanpages?: string[];
  feedback?: string;
  needsCustomer?: boolean;
}): Promise<BridgeDecisionResult> {
  const args = [
    "--decide",
    input.file,
    "--action",
    input.action,
    "--actor-role",
    input.actorRole,
    "--actor-username",
    input.actorUsername,
    "--actor-name",
    input.actorName || input.actorUsername,
    "--actor-fanpages",
    (input.actorFanpages ?? []).join(","),
    "--feedback",
    input.feedback ?? "",
  ];
  if (input.needsCustomer !== undefined) args.push("--needs-customer", input.needsCustomer ? "1" : "0");
  try {
    const res = (await runEngine(args)) as BridgeDecisionResult;
    return res;
  } finally {
    invalidateBridgeCache();
  }
}

/** Statuses a customer may see, same rule as the old approval-ui. */
export function customerCanSee(post: BridgePost): boolean {
  if (["Chờ khách duyệt", "Đã duyệt", "Chờ đăng", "Đã đăng"].includes(post.status)) return true;
  return post.status === "Sửa lại" && post.edit_requested_by_role === "customer";
}

export function adminActions(post: BridgePost): BridgeAction[] {
  const acts: BridgeAction[] = [];
  if (post.status === "Chờ duyệt") acts.push("approve");
  if (post.status === "Đã duyệt") acts.push("retry_schedule");
  if (["Chờ duyệt", "Chờ khách duyệt", "Đã duyệt", "Chờ đăng"].includes(post.status)) acts.push("request_edit");
  return acts;
}

export function customerActions(post: BridgePost): BridgeAction[] {
  const acts: BridgeAction[] = [];
  if (post.status === "Chờ khách duyệt") acts.push("approve");
  if (["Chờ khách duyệt", "Đã duyệt", "Chờ đăng"].includes(post.status)) acts.push("request_edit");
  return acts;
}

export function mediaUrlFor(rel: string): string {
  return `/api/local-media?path=${encodeURIComponent(rel)}`;
}

/** "2026-11-25 20:30" (server local time) to ISO. */
export function engineTimeToIso(raw: string): string | null {
  if (!raw || raw === "-") return null;
  const d = new Date(raw.trim().replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
