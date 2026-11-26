"use client";

import { AlertTriangle, Loader2, ShieldCheck, X } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { easeOutExpo } from "@/lib/theme";
import { cn } from "@/lib/utils";

export type ConfirmChangeItem = {
  label: string;
  before?: string;
  after: string;
};

type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
  changes?: ConfirmChangeItem[];
  requireText?: string;
  errorMessage?: string | null;
};

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel = "Hủy",
  variant = "default",
  changes,
  requireText,
  errorMessage,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descId = useId();
  const [submitting, setSubmitting] = useState(false);
  const [typedText, setTypedText] = useState("");
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      setTypedText("");
      const timer = setTimeout(() => {
        if (variant === "danger") {
          cancelBtnRef.current?.focus();
        } else {
          confirmBtnRef.current?.focus();
        }
      }, 20);
      return () => clearTimeout(timer);
    }

    if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [open, variant]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, submitting, onClose]);

  const isTextMatched = !requireText || typedText.trim() === requireText;

  async function handleConfirmClick() {
    if (submitting || !isTextMatched) return;
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4">
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => !submitting && onClose()}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            aria-hidden="true"
          />

          <m.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.24, ease: easeOutExpo }}
            className="relative z-10 w-full max-w-md rounded-t-2xl border border-line bg-surface p-5 shadow-2xl sm:rounded-2xl sm:p-6"
          >
            <div className="flex items-start gap-3.5">
              <div
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-xl border",
                  variant === "danger"
                    ? "border-red-500/30 bg-red-500/10 text-red-400"
                    : "border-accent/30 bg-accent/10 text-accent",
                )}
              >
                {variant === "danger" ? <AlertTriangle size={18} /> : <ShieldCheck size={18} />}
              </div>

              <div className="min-w-0 flex-1">
                <h2 id={titleId} className="text-base font-semibold text-fg">
                  {title}
                </h2>
                <p id={descId} className="mt-1 text-sm leading-relaxed text-fg-2">
                  {description}
                </p>
              </div>

              <button
                type="button"
                disabled={submitting}
                onClick={onClose}
                aria-label="Đóng hộp thoại"
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-fg-3 transition-colors hover:bg-elevated hover:text-fg disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </div>

            {changes && changes.length > 0 && (
              <div className="mt-4 space-y-2 rounded-xl border border-line bg-canvas/80 p-3 text-xs">
                {changes.map((item) => (
                  <div key={item.label} className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-fg-3">{item.label}</span>
                    <span className="font-medium text-fg">
                      {item.before ? (
                        <>
                          <span className="text-fg-3 line-through">{item.before}</span>
                          <span className="mx-1.5 text-fg-3">→</span>
                        </>
                      ) : null}
                      <span className="text-accent">{item.after}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}

            {requireText && (
              <div className="mt-4">
                <label className="mb-1.5 block text-xs font-medium text-fg-2">
                  Nhập <span className="font-mono font-semibold text-fg">{requireText}</span> để xác nhận:
                </label>
                <input
                  type="text"
                  value={typedText}
                  onChange={(e) => setTypedText(e.target.value)}
                  placeholder={requireText}
                  className="h-10 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-fg focus:border-red-400 focus:outline-none"
                />
              </div>
            )}

            {errorMessage && (
              <div
                role="alert"
                className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200"
              >
                {errorMessage}
              </div>
            )}

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                ref={cancelBtnRef}
                type="button"
                disabled={submitting}
                onClick={onClose}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-line bg-elevated px-4 text-sm font-medium text-fg transition-colors hover:border-line-strong disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button
                ref={confirmBtnRef}
                type="button"
                disabled={submitting || !isTextMatched}
                onClick={handleConfirmClick}
                className={cn(
                  "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50",
                  variant === "danger"
                    ? "bg-red-500 text-white hover:bg-red-600"
                    : "bg-accent text-canvas hover:bg-accent-hover",
                )}
              >
                {submitting && <Loader2 size={15} className="animate-spin" />}
                <span>{submitting ? "Đang xử lý..." : confirmLabel}</span>
              </button>
            </div>
          </m.div>
        </div>
      )}
    </AnimatePresence>
  );
}
