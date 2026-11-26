"use client";

import { CheckCircle2, ChevronDown, ChevronUp, MessageSquareWarning, RefreshCw, Send } from "lucide-react";
import { m } from "motion/react";
import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { easeOutExpo } from "@/lib/theme";
import { cn } from "@/lib/utils";

type ContentRow = {
  id: string;
  javisItemId: string;
  title: string;
  caption: string;
  mediaUrls: string[];
  status: string;
  clientFeedback: string | null;
  scheduledAt: string | null;
  customerName: string;
  customerSlug: string | null;
};

const statusLabel: Record<string, string> = {
  pending_review: "Chờ duyệt (Nội bộ)",
  pending_client: "Chờ khách duyệt",
  approved: "Khách đã duyệt",
  changes_requested: "Cần sửa",
  scheduled: "Chờ đăng",
  published: "Đã đăng",
};

export function ContentQueueClient({ canEdit = false }: { canEdit?: boolean }) {
  const [items, setItems] = useState<ContentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [syncInfo, setSyncInfo] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [feedbackId, setFeedbackId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    errorMessage: string | null;
    action: () => Promise<void>;
  } | null>(null);

  async function loadContent() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/content");
      const json = (await res.json()) as {
        ok?: boolean;
        items?: ContentRow[];
        syncResult?: { enabled: boolean; customersSynced: number; contentSynced: number };
      };
      if (res.ok && json.ok && json.items) {
        setItems(json.items);
        if (json.syncResult?.enabled) {
          setSyncInfo(
            `Đã đồng bộ trực tiếp từ Javis: ${json.syncResult.customersSynced} khách, ${json.syncResult.contentSynced} bài.`,
          );
        }
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadContent();
  }, []);

  function requestStatusChange(item: ContentRow, nextStatus: string, label: string, feedback?: string) {
    setConfirmState({
      open: true,
      title: `${label}: ${item.title}`,
      description: `Cập nhật trạng thái bài "${item.javisItemId}" thành "${statusLabel[nextStatus] ?? nextStatus}"${
        feedback ? ` với ghi chú "${feedback}"` : ""
      } và ghi trực tiếp vào sổ _cho-duyet.md của Javis.`,
      confirmLabel: label,
      errorMessage: null,
      action: async () => {
        const res = await fetch(`/api/admin/content/${item.id}/decision`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextStatus, feedback }),
        });
        const data = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !data.ok) {
          setConfirmState((prev) => (prev ? { ...prev, errorMessage: data.message ?? "Cập nhật thất bại." } : null));
          return;
        }
        setItems((prev) =>
          prev.map((x) =>
            x.id === item.id ? { ...x, status: nextStatus, clientFeedback: feedback ?? x.clientFeedback } : x,
          ),
        );
        setFeedbackId(null);
        setFeedbackText("");
        setConfirmState(null);
      },
    });
  }

  const filtered = filter === "all" ? items : items.filter((i) => i.status === filter);

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

      <div className="flex flex-wrap gap-1.5">
        {[
          { value: "all", label: "Tất cả" },
          { value: "pending_review", label: "Chờ duyệt (Nội bộ)" },
          { value: "pending_client", label: "Chờ khách duyệt" },
          { value: "approved", label: "Đã duyệt" },
          { value: "changes_requested", label: "Cần sửa" },
          { value: "scheduled", label: "Chờ đăng" },
          { value: "published", label: "Đã đăng" },
        ].map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setFilter(tab.value)}
            className={cn(
              "rounded-xl px-3 py-1.5 text-xs font-medium transition-colors",
              filter === tab.value
                ? "bg-accent text-canvas"
                : "border border-line bg-surface text-fg-2 hover:text-fg",
            )}
          >
            {tab.label}
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
          {filtered.map((item, idx) => {
            const isExpanded = expandedId === item.id;
            return (
              <m.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(idx * 0.03, 0.2), ease: easeOutExpo }}
                className="rounded-2xl border border-line bg-surface/80 p-4 sm:p-5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-accent">{item.customerName}</span>
                      <span className="rounded-lg border border-line bg-canvas px-2 py-0.5 text-[11px] font-medium text-fg-2">
                        {statusLabel[item.status] ?? item.status}
                      </span>
                    </div>
                    <h2 className="text-base font-semibold text-fg">{item.title}</h2>
                    <p className="font-mono text-xs text-fg-3">{item.javisItemId}</p>
                    {item.clientFeedback && (
                      <p className="text-xs text-amber-300">Ghi chú: {item.clientFeedback}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="inline-flex h-9 items-center gap-1 rounded-xl border border-line bg-canvas px-3 text-xs font-medium text-fg-2 hover:text-fg"
                    >
                      <span>{isExpanded ? "Thu gọn" : "Xem nội dung"}</span>
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {canEdit && item.status === "pending_review" && (
                      <button
                        type="button"
                        onClick={() => requestStatusChange(item, "pending_client", "Gửi khách duyệt")}
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-accent px-3 text-xs font-semibold text-canvas hover:bg-accent-hover"
                      >
                        <Send size={13} />
                        <span>Gửi khách duyệt</span>
                      </button>
                    )}
                    {canEdit && (item.status === "pending_review" || item.status === "pending_client") && (
                      <>
                        <button
                          type="button"
                          onClick={() => requestStatusChange(item, "approved", "Chốt đã duyệt")}
                          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line bg-elevated px-3 text-xs font-medium text-fg hover:border-line-strong"
                        >
                          <CheckCircle2 size={13} />
                          <span>Đánh dấu Đã duyệt</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFeedbackId(feedbackId === item.id ? null : item.id);
                            setFeedbackText("");
                          }}
                          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line bg-elevated px-3 text-xs font-medium text-fg-2 hover:text-fg"
                        >
                          <MessageSquareWarning size={13} />
                          <span>Yêu cầu sửa</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 space-y-3 border-t border-line pt-4">
                    <p className="whitespace-pre-line text-sm leading-relaxed text-fg-2">{item.caption}</p>
                    {item.mediaUrls.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {item.mediaUrls.map((url) => (
                          <a
                            key={url}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="overflow-hidden rounded-xl border border-line bg-canvas"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt={item.title} className="h-36 w-full object-cover" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {canEdit && feedbackId === item.id && (
                  <div className="mt-3 space-y-2 rounded-xl border border-line bg-canvas p-3">
                    <textarea
                      rows={2}
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="Nhập yêu cầu chỉnh sửa để ghi vào _cho-duyet.md..."
                      className="w-full rounded-lg border border-line bg-surface p-2.5 text-sm text-fg focus:border-accent focus:outline-none"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setFeedbackId(null)}
                        className="h-8 rounded-lg border border-line px-3 text-xs text-fg-2"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        disabled={feedbackText.trim().length < 3}
                        onClick={() =>
                          requestStatusChange(item, "changes_requested", "Gửi yêu cầu sửa", feedbackText.trim())
                        }
                        className="h-8 rounded-lg bg-accent px-3 text-xs font-semibold text-canvas disabled:opacity-50"
                      >
                        Xác nhận
                      </button>
                    </div>
                  </div>
                )}
              </m.div>
            );
          })}
        </div>
      )}

      {confirmState && (
        <ConfirmDialog
          open={confirmState.open}
          onClose={() => setConfirmState(null)}
          onConfirm={confirmState.action}
          title={confirmState.title}
          description={confirmState.description}
          confirmLabel={confirmState.confirmLabel}
          errorMessage={confirmState.errorMessage}
        />
      )}
    </div>
  );
}
