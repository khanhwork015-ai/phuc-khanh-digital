"use client";

import {
  Check,
  CheckCircle2,
  Clock3,
  Globe2,
  KeyRound,
  Lock,
  MessageCircle,
  MessageSquareText,
  RotateCcw,
  Share2,
  ThumbsUp,
} from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { Parallax } from "@/components/motion/Parallax";
import { Reveal } from "@/components/motion/Reveal";
import { ScrollScale } from "@/components/motion/ScrollScale";
import { HoaSuaPhoto } from "@/components/ui/HoaSuaPhoto";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { approvalContent, approvalPost, approvalStatuses } from "@/data/approval-demo";
import { easeOutExpo } from "@/lib/theme";
import { cn } from "@/lib/utils";

const INITIAL_STATUS = 2; // Chờ khách duyệt
const QUICK_NOTES = ["Đổi sang ảnh khác", "Làm rõ thông báo hoạt động ngày 24/11", "Đăng sớm hơn 1 tiếng"];

type Mode = "idle" | "feedback" | "approved" | "published" | "revising";

export function ApprovalPortalDemo() {
  const [unlocked, setUnlocked] = useState(false);

  return (
    <section id="cong-duyet-bai" aria-labelledby="approval-title" className="border-b border-line py-24 md:py-32">
      <div className="mx-auto grid max-w-7xl gap-14 px-5 md:px-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <Parallax distance={30} className="lg:pt-6">
          <SectionHeader
            index="03"
            eyebrow={approvalContent.eyebrow}
            title={approvalContent.title}
            description={approvalContent.description}
            id="approval-title"
          />
          <Reveal delay={0.1}>
            <ul className="mt-10 space-y-3.5 border-t border-line pt-8">
              {approvalContent.bullets.map((b) => (
                <li key={b} className="flex items-start gap-3 text-[15px] text-fg-2">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border border-line-accent bg-accent-muted">
                    <Check size={12} strokeWidth={2.25} className="text-accent" aria-hidden />
                  </span>
                  {b}
                </li>
              ))}
            </ul>
          </Reveal>
        </Parallax>

        <Reveal delay={0.1} className="min-w-0">
          {/* Khung demo phóng zoom-in + dựng thẳng + parallax khi cuộn tới */}
          <Parallax distance={-32}>
          <ScrollScale>
          <div className="overflow-hidden rounded-2xl border border-line-strong bg-surface">
            {/* Thanh trình duyệt */}
            <div className="flex items-center gap-3 border-b border-line px-4 py-3">
              <div className="flex gap-1.5" aria-hidden>
                <span className="size-2.5 rounded-full bg-white/10" />
                <span className="size-2.5 rounded-full bg-white/10" />
                <span className="size-2.5 rounded-full bg-white/10" />
              </div>
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-line bg-canvas px-3 py-1.5">
                <Lock size={12} strokeWidth={1.75} className="shrink-0 text-fg-3" aria-hidden />
                <span className="truncate font-mono text-[11.5px] text-fg-3">{approvalContent.portalUrl}</span>
              </div>
            </div>

            <div className="relative min-h-[560px]">
              <AnimatePresence mode="wait" initial={false}>
                {unlocked ? (
                  <m.div
                    key="portal"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35, ease: easeOutExpo }}
                  >
                    <Portal onLock={() => setUnlocked(false)} />
                  </m.div>
                ) : (
                  <m.div
                    key="lock"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.25, ease: easeOutExpo }}
                  >
                    <PinGate onUnlock={() => setUnlocked(true)} />
                  </m.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          </ScrollScale>
          </Parallax>
        </Reveal>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Màn hình nhập PIN                                                          */
/* -------------------------------------------------------------------------- */

function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const { demoPin } = approvalContent;
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const shakeRef = useRef<HTMLDivElement>(null);
  const [success, setSuccess] = useState(false);
  const inputId = useId();
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const submit = (value: string) => {
    if (value === demoPin) {
      setError(false);
      setSuccess(true);
      later(onUnlock, 450);
    } else {
      // Xóa ngay để khách gõ lại được liền (ô chỉ nhận 4 số), giữ nguyên focus trên ô nhập
      setError(true);
      setPin("");
      const el = shakeRef.current;
      if (el) {
        // Chạy lại animation CSS mà không tạo lại phần tử (tạo lại sẽ làm ô nhập mất focus)
        el.classList.remove("pin-shake");
        void el.offsetWidth;
        el.classList.add("pin-shake");
      }
    }
  };

  const onChange = (raw: string) => {
    if (success) return;
    const value = raw.replace(/\D/g, "").slice(0, 4);
    setPin(value);
    setError(false);
    if (value.length === 4) submit(value);
  };

  const autofill = () => {
    if (success) return;
    setPin("");
    setError(false);
    demoPin.split("").forEach((_, i) => {
      later(() => {
        const next = demoPin.slice(0, i + 1);
        setPin(next);
        if (next.length === 4) later(() => submit(next), 120);
      }, 110 * (i + 1));
    });
  };

  return (
    <div className="flex min-h-[560px] flex-col items-center justify-center px-6 py-14 text-center">
      <span
        className={cn(
          "flex size-14 items-center justify-center rounded-2xl border transition-colors duration-300",
          success ? "border-line-accent bg-accent-muted text-accent" : "border-line bg-elevated text-fg-2",
        )}
      >
        {success ? <Check size={24} strokeWidth={1.75} aria-hidden /> : <KeyRound size={22} strokeWidth={1.5} aria-hidden />}
      </span>
      <p className="mt-6 font-mono text-[12px] text-fg-3">Cổng duyệt bài riêng</p>
      <h3 className="mt-1.5 text-xl font-semibold tracking-[-0.02em] text-fg">{approvalPost.pageName}</h3>
      <p className="mt-2 max-w-xs text-[14.5px] text-fg-2">Nhập mã PIN 4 số để xem bài đang chờ bạn duyệt.</p>

      <div ref={shakeRef} className="relative mt-8">
        <label htmlFor={inputId} className="sr-only">
          Mã PIN 4 số
        </label>
        <div className="flex gap-2.5" aria-hidden>
          {[0, 1, 2, 3].map((i) => {
            const filled = i < pin.length;
            const focusNext = i === pin.length;
            return (
              <span
                key={i}
                className={cn(
                  "flex size-14 items-center justify-center rounded-xl border bg-canvas font-mono text-2xl transition-colors duration-200",
                  error
                    ? "border-red-400/60 text-red-300"
                    : success
                      ? "border-line-accent text-accent"
                      : filled
                        ? "border-line-strong text-fg"
                        : focusNext
                          ? "border-line-strong text-fg-3"
                          : "border-line text-fg-3",
                )}
              >
                {filled ? pin[i] : ""}
              </span>
            );
          })}
        </div>
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={4}
          value={pin}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error}
          aria-describedby={`${inputId}-msg`}
          className="absolute inset-0 h-full w-full cursor-text rounded-xl bg-transparent text-transparent caret-transparent outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        />
      </div>

      <p id={`${inputId}-msg`} aria-live="polite" className={cn("mt-4 h-5 text-[13px]", error ? "text-red-300" : "text-fg-3")}>
        {error ? "Mã PIN chưa đúng, bạn thử lại nhé." : success ? "Đã mở khóa" : ""}
      </p>

      <button
        type="button"
        onClick={autofill}
        className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-5 text-[14.5px] font-semibold text-canvas transition-[background-color,transform] duration-200 ease-out hover:-translate-y-px hover:bg-accent-hover"
      >
        <KeyRound size={16} strokeWidth={1.75} aria-hidden />
        Mở khóa Demo (PIN: {demoPin})
      </button>
      <p className="mt-3 text-[12.5px] text-fg-3">Hoặc tự gõ thử một mã sai để xem phản hồi.</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Giao diện cổng duyệt sau khi mở khóa                                        */
/* -------------------------------------------------------------------------- */

function Portal({ onLock }: { onLock: () => void }) {
  const [status, setStatus] = useState(INITIAL_STATUS);
  const [mode, setMode] = useState<Mode>("idle");
  const [note, setNote] = useState("");
  const timers = useRef<number[]>([]);
  const noteId = useId();

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const approve = () => {
    setMode("approved");
    setStatus(3);
    later(() => setStatus(4), 650);
  };

  const fastForward = () => {
    setStatus(5);
    setMode("published");
  };

  const sendFeedback = () => {
    if (!note.trim()) return;
    setMode("revising");
    setStatus(0);
  };

  const reset = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setStatus(INITIAL_STATUS);
    setMode("idle");
    setNote("");
  };

  return (
    <div className="flex flex-col">
      {/* Đầu cổng */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <p className="text-[14px] font-semibold text-fg">1 bài chờ bạn duyệt</p>
          <p className="mt-0.5 font-mono text-[11.5px] text-fg-3">
            {approvalPost.pillar} · dự kiến {approvalPost.scheduledLabel}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] text-fg-3 transition-colors hover:bg-white/[0.04] hover:text-fg"
          >
            <RotateCcw size={13} strokeWidth={1.75} aria-hidden />
            Thử lại
          </button>
          <button
            type="button"
            onClick={onLock}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] text-fg-3 transition-colors hover:bg-white/[0.04] hover:text-fg"
          >
            <Lock size={13} strokeWidth={1.75} aria-hidden />
            Khóa
          </button>
        </div>
      </div>

      <StatusTrack status={status} />

      <div className="grid gap-5 p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <PostPreview published={status === 5} />

        <div className="flex flex-col">
          <AnimatePresence mode="wait" initial={false}>
            {mode === "idle" && (
              <Panel key="idle">
                <p className="text-[14px] leading-relaxed text-fg-2">
                  Bài đã qua 4 bước kiểm duyệt của đội ngũ. Bạn xem lại nội dung, ngày thông báo và hình ảnh, nếu ổn thì bấm Duyệt.
                </p>
                <div className="mt-auto grid gap-2.5 pt-6">
                  <button
                    type="button"
                    onClick={approve}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-accent text-[14.5px] font-semibold text-canvas transition-[background-color,transform] duration-200 ease-out hover:-translate-y-px hover:bg-accent-hover"
                  >
                    <Check size={16} strokeWidth={2} aria-hidden />
                    Duyệt bài
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("feedback")}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-line-strong text-[14.5px] font-medium text-fg transition-[background-color,border-color,transform] duration-200 ease-out hover:-translate-y-px hover:border-white/30 hover:bg-white/[0.04]"
                  >
                    <MessageSquareText size={16} strokeWidth={1.5} aria-hidden />
                    Yêu cầu chỉnh sửa
                  </button>
                </div>
              </Panel>
            )}

            {mode === "feedback" && (
              <Panel key="feedback">
                <label htmlFor={noteId} className="text-[13.5px] font-medium text-fg">
                  Bạn muốn sửa gì?
                </label>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {QUICK_NOTES.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setNote(q)}
                      className={cn(
                        "rounded-lg border px-2.5 py-1 text-[12.5px] transition-colors",
                        note === q ? "border-line-accent bg-accent-muted text-ivory" : "border-line text-fg-2 hover:border-line-strong hover:text-fg",
                      )}
                    >
                      {q}
                    </button>
                  ))}
                </div>
                <textarea
                  id={noteId}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  data-lenis-prevent
                  placeholder="Ví dụ: đổi giá combo, thay ảnh khác..."
                  className="mt-3 w-full resize-none rounded-xl border border-line bg-canvas px-3.5 py-3 text-[14px] text-fg placeholder:text-fg-3 focus:border-line-strong focus:outline-none"
                />
                <div className="mt-auto grid grid-cols-2 gap-2.5 pt-4">
                  <button
                    type="button"
                    onClick={() => setMode("idle")}
                    className="h-11 rounded-xl border border-line text-[14px] text-fg-2 transition-colors hover:border-line-strong hover:text-fg"
                  >
                    Quay lại
                  </button>
                  <button
                    type="button"
                    onClick={sendFeedback}
                    disabled={!note.trim()}
                    className="h-11 rounded-xl bg-accent text-[14px] font-semibold text-canvas transition-[background-color,opacity] hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Gửi góp ý
                  </button>
                </div>
              </Panel>
            )}

            {mode === "approved" && (
              <Panel key="approved">
                <Notice icon={<Clock3 size={18} strokeWidth={1.5} aria-hidden />} title="Đã duyệt, bài đang chờ đăng">
                  Hệ thống sẽ tự đăng lúc <span className="font-mono text-ivory">{approvalPost.scheduledLabel}</span>. Bạn không cần
                  làm thêm gì.
                </Notice>
                <button
                  type="button"
                  onClick={fastForward}
                  disabled={status < 4}
                  className="mt-auto inline-flex h-11 items-center justify-center rounded-xl border border-line-strong text-[14px] text-fg transition-colors hover:bg-white/[0.04] disabled:opacity-40"
                >
                  Tua nhanh tới giờ đăng
                </button>
              </Panel>
            )}

            {mode === "published" && (
              <Panel key="published">
                <Notice icon={<CheckCircle2 size={18} strokeWidth={1.5} aria-hidden />} title="Bài đã lên trang đúng giờ">
                  Số liệu của bài sẽ có trong báo cáo tuần gửi bạn vào sáng Chủ nhật.
                </Notice>
              </Panel>
            )}

            {mode === "revising" && (
              <Panel key="revising">
                <Notice icon={<MessageSquareText size={18} strokeWidth={1.5} aria-hidden />} title="Đội ngũ đã nhận góp ý">
                  Bài chuyển về trạng thái Nháp để chỉnh sửa. Bản mới sẽ quay lại cổng này để bạn xem lần nữa.
                </Notice>
                <blockquote className="mt-4 rounded-xl border border-line bg-canvas px-3.5 py-3 text-[13.5px] text-fg-2">
                  &ldquo;{note}&rdquo;
                </blockquote>
              </Panel>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.25, ease: easeOutExpo }}
      className="flex h-full flex-col"
    >
      {children}
    </m.div>
  );
}

function Notice({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div role="status" className="rounded-xl border border-line-accent bg-accent-muted p-4">
      <p className="flex items-center gap-2 text-[14.5px] font-semibold text-ivory">
        <span className="text-accent">{icon}</span>
        {title}
      </p>
      <p className="mt-2 text-[13.5px] leading-relaxed text-fg-2">{children}</p>
    </div>
  );
}

function StatusTrack({ status }: { status: number }) {
  return (
    <div className="border-b border-line px-5 py-4">
      <div className="flex items-center justify-between">
        <span className="text-[12.5px] text-fg-3">Trạng thái</span>
        <AnimatePresence mode="popLayout" initial={false}>
          <m.span
            key={status}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            aria-live="polite"
            className={cn(
              "rounded-md border px-2 py-0.5 font-mono text-[11.5px]",
              status === 5 || status === 4 ? "border-line-accent bg-accent-muted text-accent" : "border-line text-fg",
            )}
          >
            {approvalStatuses[status]}
          </m.span>
        </AnimatePresence>
      </div>
      <ol className="mt-3 grid grid-cols-6 gap-1.5">
        {approvalStatuses.map((label, i) => (
          <li key={label} className="min-w-0">
            <div className="h-[3px] overflow-hidden rounded-full bg-white/[0.08]">
              <m.div
                className="h-full origin-left bg-accent"
                initial={false}
                animate={{ scaleX: i <= status ? 1 : 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 30, delay: i <= status ? i * 0.04 : 0 }}
              />
            </div>
            <span
              className={cn(
                "mt-1.5 hidden truncate text-[10.5px] transition-colors duration-300 sm:block",
                i === status ? "text-fg" : "text-fg-3",
              )}
            >
              {label}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function PostPreview({ published }: { published: boolean }) {
  return (
    <article className="overflow-hidden rounded-xl border border-line bg-canvas">
      <header className="flex items-center gap-3 px-3.5 pt-3.5">
        <Image
          src={approvalPost.avatarSrc}
          alt="Ảnh đại diện Hoa Sữa"
          width={36}
          height={36}
          className="size-9 shrink-0 rounded-full border border-line object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-semibold text-fg">{approvalPost.pageName}</p>
          <p className="flex items-center gap-1 text-[11.5px] text-fg-3">
            {published ? "Vừa xong" : approvalPost.scheduledLabel} · <Globe2 size={10} strokeWidth={1.5} aria-hidden />
          </p>
        </div>
      </header>
      <p className="whitespace-pre-line px-3.5 pt-2.5 text-[13.5px] leading-[1.55] text-fg/90">{approvalPost.caption}</p>
      <div className="relative mt-3 aspect-[4/3] overflow-hidden border-y border-line">
        <HoaSuaPhoto />
        <span className="absolute right-2.5 top-2.5 flex items-center gap-1.5 rounded-lg bg-canvas/70 px-2 py-1 backdrop-blur-sm">
          <Image src={approvalPost.logoSrc} alt="Logo Hoa Sữa Coffee & Tea" width={22} height={27} />
          <span className="text-[9.5px] font-bold tracking-[0.08em] text-ivory">HOA SỮA</span>
        </span>
      </div>
      <div className="grid grid-cols-3 px-2 py-1.5 text-[12px] text-fg-2">
        {[
          { icon: ThumbsUp, label: "Thích" },
          { icon: MessageCircle, label: "Bình luận" },
          { icon: Share2, label: "Chia sẻ" },
        ].map(({ icon: Icon, label }) => (
          <span key={label} className="flex items-center justify-center gap-1.5 py-1">
            <Icon size={14} strokeWidth={1.5} aria-hidden />
            <span className="hidden xl:inline">{label}</span>
          </span>
        ))}
      </div>
    </article>
  );
}
