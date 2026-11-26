"use client";

import { CheckCircle2, Loader2, MessageSquareWarning, RotateCcw, Send, X } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { FacebookPostPreview } from "@/components/content/FacebookPostPreview";
import { cn } from "@/lib/utils";

export type ReviewAction = "approve" | "request_edit" | "retry_schedule";

export type ActionResult = { ok: boolean; message?: string };

/**
 * Popup that shows only the post itself, Facebook style, plus the actions the
 * engine allows for the current status. "Yêu cầu sửa" and "approve" each open a
 * second, smaller popup on top; the edit reason is what the revision bot receives.
 */
export function PostReviewModal({
  title,
  code,
  statusLabel,
  pageName,
  logoUrl,
  timeLabel,
  caption,
  mediaUrls,
  notes,
  actions,
  approveLabel,
  approveHint,
  readOnlyNote,
  onAction,
  onClose,
}: {
  title: string;
  code?: string;
  statusLabel: string;
  pageName: string;
  logoUrl?: string | null;
  timeLabel: string;
  caption: string;
  mediaUrls: string[];
  notes?: ReactNode;
  actions: ReviewAction[];
  approveLabel: string;
  approveHint: string;
  readOnlyNote?: string;
  onAction: (action: ReviewAction, feedback?: string) => Promise<ActionResult>;
  onClose: () => void;
}) {
  const [dialog, setDialog] = useState<"none" | "edit" | "approve">("none");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape" || busy) return;
      if (lightbox) setLightbox(null);
      else if (dialog !== "none") setDialog("none");
      else onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [lightbox, busy, dialog, onClose]);

  function openDialog(next: "edit" | "approve") {
    setError(null);
    setDialog(next);
  }

  async function run(action: ReviewAction, feedback?: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await onAction(action, feedback);
      if (!res.ok) setError(res.message ?? "Thao tác thất bại.");
    } catch {
      setError("Lỗi kết nối máy chủ.");
    } finally {
      setBusy(false);
    }
  }

  const canApprove = actions.includes("approve");
  const canEdit = actions.includes("request_edit");
  const canRetry = actions.includes("retry_schedule");
  const reasonOk = reason.trim().length >= 3;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-4"
      onClick={() => !busy && dialog === "none" && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Xem bài đăng ${title}`}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[94dvh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-line-strong bg-surface shadow-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {code && <span className="font-mono text-xs text-fg-3">{code}</span>}
              <span className="rounded-full border border-line-accent bg-accent-muted px-2.5 py-0.5 text-[11px] font-semibold text-accent">
                {statusLabel}
              </span>
            </div>
            <h3 className="mt-1.5 break-words text-[15px] font-semibold leading-snug text-fg sm:text-base">{title}</h3>
          </div>
          <button
            type="button"
            aria-label="Đóng"
            disabled={busy}
            onClick={onClose}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-line text-fg-2 hover:text-fg"
          >
            <X size={16} />
          </button>
        </div>

        <div data-lenis-prevent className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-3 sm:p-5">
          <FacebookPostPreview
            pageName={pageName}
            logoUrl={logoUrl}
            timeLabel={timeLabel}
            caption={caption}
            mediaUrls={mediaUrls}
            onOpenImage={setLightbox}
          />
          {notes}
          {error && dialog === "none" && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-200">{error}</div>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-line bg-elevated/50 px-4 py-3 sm:px-5">
          {actions.length === 0 ? (
            <p className="mr-auto text-xs text-fg-3">{readOnlyNote ?? "Bài này không có thao tác nào ở trạng thái hiện tại."}</p>
          ) : (
            <>
              {canRetry && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void run("retry_schedule")}
                  className="mr-auto inline-flex h-10 items-center gap-1.5 rounded-xl border border-line bg-surface px-4 text-xs font-semibold text-fg-2 hover:text-fg"
                >
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                  Hẹn đăng lại
                </button>
              )}
              {canEdit && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => openDialog("edit")}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 text-xs font-semibold text-rose-300 hover:bg-rose-500/20"
                >
                  <MessageSquareWarning size={14} />
                  Yêu cầu sửa
                </button>
              )}
              {canApprove && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => openDialog("approve")}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-accent px-5 text-xs font-bold text-canvas hover:bg-accent-hover"
                >
                  <Send size={14} />
                  {approveLabel}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {dialog !== "none" && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
          onClick={(e) => {
            e.stopPropagation();
            if (!busy) setDialog("none");
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={dialog === "edit" ? "Lý do yêu cầu sửa" : "Xác nhận duyệt bài"}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "w-full max-w-md rounded-2xl border bg-surface p-5 shadow-2xl",
              dialog === "edit" ? "border-rose-500/40" : "border-line-accent",
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-xl",
                  dialog === "edit" ? "bg-rose-500/15 text-rose-300" : "bg-accent-muted text-accent",
                )}
              >
                {dialog === "edit" ? <MessageSquareWarning size={18} /> : <CheckCircle2 size={18} />}
              </div>
              <div className="min-w-0">
                <h4 className="text-base font-semibold text-fg">
                  {dialog === "edit" ? "Yêu cầu sửa bài" : approveLabel}
                </h4>
                <p className="mt-0.5 line-clamp-2 text-xs text-fg-3">{title}</p>
              </div>
            </div>

            {dialog === "edit" ? (
              <div className="mt-4 space-y-2">
                <label htmlFor="edit-reason" className="block text-xs font-semibold text-fg">
                  Lý do yêu cầu sửa <span className="text-rose-300">*</span>
                </label>
                <textarea
                  id="edit-reason"
                  rows={5}
                  autoFocus
                  maxLength={1500}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ví dụ: Đổi tiêu đề ngắn hơn, bỏ hashtag cuối, ảnh 2 thay bằng ảnh sản phẩm thật..."
                  className="w-full resize-none rounded-xl border border-line bg-canvas p-3 text-sm text-fg focus:border-rose-400 focus:outline-none"
                />
                <div className="flex justify-between text-[11px] text-fg-3">
                  <span>Bot sửa bài nhận nguyên văn nội dung này.</span>
                  <span>{reason.trim().length}/1500</span>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm leading-relaxed text-fg-2">{approveHint}</p>
            )}

            {error && (
              <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-200">
                {error}
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setDialog("none")}
                className="h-10 rounded-xl border border-line px-4 text-xs font-medium text-fg-2 hover:text-fg"
              >
                Huỷ
              </button>
              {dialog === "edit" ? (
                <button
                  type="button"
                  disabled={busy || !reasonOk}
                  onClick={() => void run("request_edit", reason.trim())}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-rose-500 px-5 text-xs font-semibold text-white hover:bg-rose-400 disabled:opacity-50"
                >
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  Gửi yêu cầu sửa
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void run("approve")}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-accent px-5 text-xs font-bold text-canvas hover:bg-accent-hover disabled:opacity-60"
                >
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  Xác nhận
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-[70] flex cursor-zoom-out items-center justify-center bg-black/90 p-4"
          onClick={(e) => {
            e.stopPropagation();
            setLightbox(null);
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="Xem ảnh phóng to" className="max-h-[92vh] max-w-[95vw] rounded-xl object-contain" />
        </div>
      )}
    </div>
  );
}
