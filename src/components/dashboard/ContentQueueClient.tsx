"use client";

import { RefreshCw } from "lucide-react";
import { m } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { formatPostTime } from "@/components/content/FacebookPostPreview";
import { PostReviewModal, type ReviewAction } from "@/components/content/PostReviewModal";
import { easeOutExpo } from "@/lib/theme";
import { cn } from "@/lib/utils";

type ContentRow = {
  id: string;
  code: string;
  title: string;
  caption: string;
  mediaUrls: string[];
  status: string;
  rawStatus: string;
  scheduledAt: string | null;
  customerName: string;
  customerSlug: string | null;
  logoUrl: string | null;
  feedback: string;
  feedbackHistory: string;
  scheduleError: string;
  editRequestedByRole: string;
  postId: string;
  actions: ReviewAction[];
};

const statusLabel: Record<string, string> = {
  pending_review: "Chờ duyệt (Nội bộ)",
  pending_client: "Chờ khách duyệt",
  approved: "Đã duyệt",
  changes_requested: "Đang sửa lại",
  scheduled: "Chờ đăng",
  published: "Đã đăng",
};

const tabs = [
  { value: "all", label: "Tất cả" },
  { value: "pending_review", label: "Chờ duyệt (Nội bộ)" },
  { value: "pending_client", label: "Chờ khách duyệt" },
  { value: "changes_requested", label: "Đang sửa lại" },
  { value: "approved", label: "Đã duyệt" },
  { value: "scheduled", label: "Chờ đăng" },
  { value: "published", label: "Đã đăng" },
];

export function ContentQueueClient({ canEdit = false }: { canEdit?: boolean }) {
  const [items, setItems] = useState<ContentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [syncInfo, setSyncInfo] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const loadContent = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res = await fetch("/api/admin/content", { cache: "no-store" });
      const json = (await res.json()) as {
        ok?: boolean;
        items?: ContentRow[];
        syncResult?: { enabled: boolean; customersSynced: number; contentSynced: number; error?: string };
      };
      if (res.ok && json.ok && json.items) {
        setItems(json.items);
        if (json.syncResult?.error) setSyncInfo(`Lỗi đồng bộ: ${json.syncResult.error}`);
        else if (json.syncResult?.enabled)
          setSyncInfo(`Đồng bộ trực tiếp từ Javis: ${json.syncResult.contentSynced} bài.`);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadContent();
  }, [loadContent]);

  const selected = items.find((i) => i.id === selectedId) ?? null;
  const filtered = filter === "all" ? items : items.filter((i) => i.status === filter);
  const countOf = (v: string) => (v === "all" ? items.length : items.filter((i) => i.status === v).length);

  async function decide(item: ContentRow, action: ReviewAction, feedback?: string) {
    const res = await fetch(`/api/admin/content/${item.id}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, feedback }),
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
    if (!res.ok || !data.ok) return { ok: false, message: data.message ?? "Thao tác thất bại." };
    setSelectedId(null);
    setNotice(data.message ?? "Đã ghi nhận.");
    await loadContent(true);
    return { ok: true };
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent">Đồng bộ Javis OS</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-fg">Sổ Duyệt Bài</h1>
          {syncInfo && <p className="mt-1 text-xs text-emerald-300">{syncInfo}</p>}
        </div>
        <button
          type="button"
          onClick={() => void loadContent()}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 text-xs font-medium text-fg hover:border-line-strong"
        >
          <RefreshCw size={14} />
          <span>Quét lại từ Javis</span>
        </button>
      </div>

      {notice && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} className="text-xs text-emerald-300 hover:underline">
            Ẩn
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setFilter(tab.value)}
            className={cn(
              "rounded-xl px-3 py-1.5 text-xs font-medium transition-colors",
              filter === tab.value ? "bg-accent text-canvas" : "border border-line bg-surface text-fg-2 hover:text-fg",
            )}
          >
            {tab.label} <span className="opacity-70">({countOf(tab.value)})</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl border border-line bg-surface" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface/60 p-8 text-center text-sm text-fg-3">
          Chưa có bài viết nào phù hợp bộ lọc hiện tại.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filtered.map((item, idx) => (
            <m.button
              key={item.id}
              type="button"
              onClick={() => setSelectedId(item.id)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: Math.min(idx * 0.03, 0.2), ease: easeOutExpo }}
              className="group w-full rounded-2xl border border-line bg-surface/80 p-4 text-left transition-colors hover:border-line-accent hover:bg-surface sm:p-5"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 gap-3">
                  {item.mediaUrls[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.mediaUrls[0]}
                      alt=""
                      className="size-16 shrink-0 rounded-xl border border-line object-cover"
                    />
                  )}
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-accent">{item.customerName}</span>
                      <span className="rounded-lg border border-line bg-canvas px-2 py-0.5 text-[11px] font-medium text-fg-2">
                        {item.rawStatus || statusLabel[item.status] || item.status}
                      </span>
                      {item.mediaUrls.length > 0 && (
                        <span className="rounded-lg border border-line bg-elevated px-2 py-0.5 font-mono text-[10px] text-fg-3">
                          {item.mediaUrls.length} ảnh
                        </span>
                      )}
                    </div>
                    <h2 className="text-base font-semibold text-fg transition-colors group-hover:text-accent">
                      {item.title}
                    </h2>
                    <p className="font-mono text-xs text-fg-3">
                      {item.code} · {formatPostTime(item.scheduledAt)}
                    </p>
                    {item.feedback && <p className="line-clamp-2 text-xs text-amber-300">Yêu cầu sửa: {item.feedback}</p>}
                    {item.scheduleError && <p className="line-clamp-2 text-xs text-red-300">Lỗi hẹn đăng: {item.scheduleError}</p>}
                  </div>
                </div>
                <span className="inline-flex h-9 shrink-0 items-center justify-center rounded-xl border border-line bg-canvas px-3.5 text-xs font-medium text-fg-2 transition-colors group-hover:border-line-accent group-hover:text-accent">
                  Xem bài đăng
                </span>
              </div>
            </m.button>
          ))}
        </div>
      )}

      {selected && (
        <PostReviewModal
          key={selected.id}
          title={selected.title}
          code={selected.code}
          statusLabel={selected.rawStatus || statusLabel[selected.status] || selected.status}
          pageName={selected.customerName}
          logoUrl={selected.logoUrl}
          timeLabel={formatPostTime(selected.scheduledAt)}
          caption={selected.caption}
          mediaUrls={selected.mediaUrls}
          actions={canEdit ? selected.actions : []}
          approveLabel="Gửi khách duyệt"
          approveHint="Admin duyệt bài này. Nếu fanpage có tài khoản khách, bài chuyển sang Chờ khách duyệt; nếu không, Javis hẹn lịch đăng ngay."
          readOnlyNote={canEdit ? undefined : "Chế độ chỉ xem (không có quyền thao tác duyệt bài)."}
          onAction={(action, feedback) => decide(selected, action, feedback)}
          onClose={() => setSelectedId(null)}
          notes={
            <>
              {selected.feedback && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-200">
                  <span className="font-semibold">
                    Yêu cầu sửa gần nhất{selected.editRequestedByRole === "customer" ? " (từ khách)" : ""}:
                  </span>{" "}
                  {selected.feedback}
                </div>
              )}
              {selected.scheduleError && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-200">
                  <span className="font-semibold">Lỗi hẹn đăng:</span> {selected.scheduleError}
                </div>
              )}
              {selected.feedbackHistory && (
                <details className="rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-xs text-fg-2">
                  <summary className="cursor-pointer font-semibold text-fg">Lịch sử góp ý</summary>
                  <p className="mt-2 whitespace-pre-line">{selected.feedbackHistory}</p>
                </details>
              )}
            </>
          }
        />
      )}
    </div>
  );
}
