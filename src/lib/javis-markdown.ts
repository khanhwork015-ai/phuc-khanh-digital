import type { ContentStatus, ContractStatus } from "../db/types.ts";

export type ParsedJavisCustomer = {
  slug: string;
  businessName: string;
  pageId: string;
  contractStatus: ContractStatus;
  contractSummary: string;
  owner: string;
  notes: string;
};

export type ParsedJavisContent = {
  fanpageName: string;
  itemCode: string;
  title: string;
  status: ContentStatus;
  rawStatus: string;
  scheduledText: string;
  notes: string;
};

const viToStatusMap: Record<string, ContentStatus> = {
  "chờ duyệt": "pending_review",
  "chờ khách duyệt": "pending_client",
  "đã duyệt": "approved",
  "cần sửa": "changes_requested",
  "yêu cầu sửa": "changes_requested",
  "chờ đăng": "scheduled",
  "đã đăng": "published",
};

const statusToViMap: Record<ContentStatus, string> = {
  pending_review: "Chờ duyệt",
  pending_client: "Chờ khách duyệt",
  approved: "Đã duyệt",
  changes_requested: "Cần sửa",
  scheduled: "Chờ đăng",
  published: "Đã đăng",
};

function stripBackticks(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("`") && trimmed.endsWith("`") && trimmed.length >= 2) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function splitMarkdownRow(line: string): string[] {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|")) return [];
  const inner = trimmed.endsWith("|") ? trimmed.slice(1, -1) : trimmed.slice(1);
  return inner.split("|").map((cell) => cell.trim());
}

function isSeparatorRow(cells: string[]): boolean {
  return cells.length > 0 && cells.every((c) => /^:?-{3,}:?$/.test(c));
}

export function parseCustomersMarkdown(markdown: string): ParsedJavisCustomer[] {
  const results: ParsedJavisCustomer[] = [];
  for (const line of markdown.split(/\r?\n/)) {
    const cells = splitMarkdownRow(line);
    if (cells.length < 8 || isSeparatorRow(cells)) continue;
    if (cells[0].toLowerCase() === "stt") continue;

    const slug = stripBackticks(cells[1]);
    const businessName = cells[2].trim();
    if (!slug || !businessName) continue;

    const rawStatus = stripBackticks(cells[4]).toLowerCase();
    const contractStatus: ContractStatus =
      rawStatus === "onboarding" || rawStatus === "active" || rawStatus === "paused" || rawStatus === "completed"
        ? rawStatus
        : "active";

    results.push({
      slug,
      businessName,
      pageId: stripBackticks(cells[3]),
      contractStatus,
      contractSummary: cells[5].trim(),
      owner: stripBackticks(cells[6]),
      notes: cells[7].trim() === "-" ? "" : cells[7].trim(),
    });
  }
  return results;
}

export function parseApprovalQueueMarkdown(markdown: string): ParsedJavisContent[] {
  const results: ParsedJavisContent[] = [];
  for (const line of markdown.split(/\r?\n/)) {
    const cells = splitMarkdownRow(line);
    if (cells.length < 7 || isSeparatorRow(cells)) continue;
    if (cells[0].toLowerCase() === "stt") continue;

    const fanpageName = cells[1].trim();
    const itemCode = stripBackticks(cells[2]);
    const title = cells[3].trim();
    if (!itemCode || !title) continue;

    const rawStatus = stripBackticks(cells[4]);
    const status = viToStatusMap[rawStatus.toLowerCase()] ?? "pending_review";

    results.push({
      fanpageName,
      itemCode,
      title,
      status,
      rawStatus,
      scheduledText: cells[5].trim(),
      notes: cells[6].trim() === "-" ? "" : cells[6].trim(),
    });
  }
  return results;
}

export function updateApprovalRowInMarkdown(
  markdown: string,
  itemCode: string,
  nextStatus: ContentStatus,
  feedback?: string | null,
): { updated: boolean; content: string } {
  const nextViStatus = statusToViMap[nextStatus];
  let updated = false;

  const lines = markdown.split(/\r?\n/).map((line) => {
    const cells = splitMarkdownRow(line);
    if (cells.length < 7 || isSeparatorRow(cells) || cells[0].toLowerCase() === "stt") {
      return line;
    }
    const rowCode = stripBackticks(cells[2]);
    if (rowCode !== itemCode) return line;

    updated = true;
    cells[4] = `\`${nextViStatus}\``;
    if (feedback && feedback.trim()) {
      cells[6] = feedback.trim().replace(/\|/g, "/");
    }
    return `| ${cells.join(" | ")} |`;
  });

  return { updated, content: lines.join("\n") };
}
