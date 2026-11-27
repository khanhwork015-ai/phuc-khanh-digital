"use client";

import {
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  Globe2,
  MessageCircle,
  PenLine,
  Share2,
  ThumbsUp,
} from "lucide-react";
import Image from "next/image";
import { AnimatePresence, m, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { heroMockPost, heroMockPosts } from "@/data/site-config";
import { easeOutExpo } from "@/lib/theme";
import { cn } from "@/lib/utils";

const STAGE_MS = 2600;

function pickNextDifferentBrandIndex(currentIdx: number): number {
  const total = heroMockPosts.length;
  if (total <= 1) return 0;
  const currentBrand = heroMockPosts[currentIdx]?.brandId;
  for (let offset = 1; offset < total; offset++) {
    const candidate = (currentIdx + offset) % total;
    if (heroMockPosts[candidate]?.brandId !== currentBrand) {
      return candidate;
    }
  }
  return (currentIdx + 1) % total;
}

const pageTurnVariants = {
  enter: (direction: 1 | -1) => ({
    opacity: 0,
    rotateY: direction === 1 ? 14 : -24,
    x: direction === 1 ? 20 : -24,
    scale: 0.97,
    transformOrigin: direction === 1 ? "right center" : "left center",
  }),
  center: {
    opacity: 1,
    rotateY: 0,
    x: 0,
    scale: 1,
    transformOrigin: "left center",
  },
  exit: (direction: 1 | -1) => ({
    opacity: 0,
    rotateY: direction === 1 ? -52 : 52,
    x: direction === 1 ? -28 : 28,
    scale: 0.96,
    transformOrigin: direction === 1 ? "left center" : "right center",
  }),
};

export function HeroPostMockup() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-40px" });
  const reduce = useReducedMotion();
  const [cursor, setCursor] = useState<{ postIndex: number; stage: number; direction: 1 | -1 }>({
    postIndex: 0,
    stage: 0,
    direction: 1,
  });
  const [manualTick, setManualTick] = useState(0);
  const stages = heroMockPost.stages;
  const totalPosts = heroMockPosts.length;
  const post = heroMockPosts[cursor.postIndex] ?? heroMockPosts[0];
  const stage = cursor.stage;
  const current = stages[stage].key;

  useEffect(() => {
    const brandStartIndices: number[] = [];
    const seenBrands = new Set<string>();
    heroMockPosts.forEach((item, idx) => {
      if (!seenBrands.has(item.brandId)) {
        seenBrands.add(item.brandId);
        brandStartIndices.push(idx);
      }
    });
    if (brandStartIndices.length > 1) {
      const picked = brandStartIndices[Math.floor(Math.random() * brandStartIndices.length)];
      setCursor({ postIndex: picked, stage: 0, direction: 1 });
    }
  }, []);

  useEffect(() => {
    if (!inView) return;
    const id = window.setInterval(() => {
      setCursor((prev) => {
        if (prev.stage + 1 < stages.length) {
          return { ...prev, stage: prev.stage + 1 };
        }
        return { postIndex: pickNextDifferentBrandIndex(prev.postIndex), stage: 0, direction: 1 };
      });
    }, STAGE_MS);
    return () => window.clearInterval(id);
  }, [inView, stages.length, manualTick]);

  function stepPost(delta: 1 | -1) {
    if (totalPosts <= 1) return;
    setCursor((prev) => ({
      postIndex: (prev.postIndex + delta + totalPosts) % totalPosts,
      stage: 2,
      direction: delta,
    }));
    setManualTick((t) => t + 1);
  }

  function selectPost(targetIndex: number) {
    if (targetIndex === cursor.postIndex || targetIndex < 0 || targetIndex >= totalPosts) return;
    const direction: 1 | -1 = targetIndex > cursor.postIndex ? 1 : -1;
    setCursor({ postIndex: targetIndex, stage: 2, direction });
    setManualTick((t) => t + 1);
  }

  const showImage = current !== "writing";
  const showLogo = current !== "writing";
  const published = current === "published";

  return (
    <div ref={ref} className="relative" aria-roledescription="carousel" aria-label="Bài đăng mẫu">
      {/* Các lá bài phía sau nghiêng nhẹ xoè quạt; bài chính luôn đứng thẳng và lật mở như trang giấy */}
      <div className="relative px-2 pb-6 [perspective:1400px] sm:px-3">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-4 bottom-1 top-5 z-0 origin-bottom -translate-x-2 -rotate-[4deg] rounded-2xl border border-line bg-surface/45 opacity-60"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-4 bottom-1 top-5 z-0 origin-bottom translate-x-2 rotate-[4deg] rounded-2xl border border-line bg-surface/45 opacity-60"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-3 bottom-2.5 top-2.5 z-[1] origin-bottom translate-x-1 rotate-[2deg] rounded-2xl border border-line-strong bg-surface/75 opacity-85 backdrop-blur-sm"
        />

        <AnimatePresence mode="popLayout" custom={cursor.direction} initial={false}>
          <m.div
            key={post.id}
            custom={cursor.direction}
            variants={reduce ? undefined : pageTurnVariants}
            initial={reduce ? false : "enter"}
            animate="center"
            exit={reduce ? undefined : "exit"}
            transition={{ duration: reduce ? 0.12 : 0.48, ease: easeOutExpo }}
            style={reduce ? undefined : { backfaceVisibility: "hidden", transformStyle: "preserve-3d" }}
            className="relative z-10 rounded-2xl border border-line-strong bg-surface/95 p-2.5 shadow-xl shadow-black/30 backdrop-blur-md"
          >
        {/* Thanh trạng thái */}
        <div className="flex items-center justify-between px-2.5 pb-2.5 pt-1">
          <div className="flex items-center gap-1.5" aria-hidden>
            <span className="size-2 rounded-full bg-white/15" />
            <span className="size-2 rounded-full bg-white/15" />
            <span className="size-2 rounded-full bg-white/15" />
          </div>
          <div className="relative h-6 min-w-[150px] text-right">
            <AnimatePresence mode="popLayout" initial={false}>
              <m.span
                key={current}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25, ease: easeOutExpo }}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[11px]",
                  published ? "border-line-accent bg-accent-muted text-accent" : "border-line text-fg-2",
                )}
              >
                <span
                  className={cn("size-1.5 rounded-full", published ? "bg-accent" : "animate-pulse bg-fg-2")}
                />
                {stages[stage].label}
              </m.span>
            </AnimatePresence>
          </div>
        </div>

        {/* Bài đăng */}
        <article className="overflow-hidden rounded-xl border border-line bg-surface">
          <header className="flex items-center gap-3 px-4 pt-4">
            <Image
              src={post.avatarSrc}
              alt={`Ảnh đại diện ${post.pageName}`}
              width={40}
              height={40}
              className="size-10 shrink-0 rounded-full border border-line object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-semibold text-fg">{post.pageName}</p>
              <p className="flex items-center gap-1 text-[12px] text-fg-3">
                {published ? "Vừa xong" : "Đã lên lịch"} · <Globe2 size={11} strokeWidth={1.5} aria-hidden />
              </p>
            </div>
            <span className="hidden items-center gap-1 font-mono text-[11px] text-fg-3 sm:inline-flex">
              <CalendarClock size={12} strokeWidth={1.5} aria-hidden />
              {post.scheduledAt}
            </span>
          </header>

          <Caption key={post.id} text={post.caption} typing={current === "writing" && !reduce} />

          {/* Ảnh */}
          <div className="relative mt-3 aspect-[4/3] overflow-hidden border-y border-line bg-elevated">
            <AnimatePresence initial={false}>
              {showImage ? (
                <m.div
                  key={`photo-${post.id}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.45, ease: easeOutExpo }}
                  className="absolute inset-0"
                >
                  <Image
                    src={post.photoSrc}
                    alt={post.photoAlt}
                    fill
                    sizes="(max-width: 1024px) 100vw, 520px"
                    className="object-contain"
                    priority
                  />
                </m.div>
              ) : (
                <m.div
                  key="placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <span className="flex items-center gap-2 font-mono text-[11px] text-fg-3">
                    <PenLine size={13} strokeWidth={1.5} aria-hidden />
                    Đang dựng ảnh đời thực
                  </span>
                </m.div>
              )}
            </AnimatePresence>

            {/* Vùng an toàn logo */}
            <AnimatePresence>
              {showLogo && (
                <m.div
                  key={`logo-${post.id}`}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", stiffness: 380, damping: 30, delay: 0.15 }}
                  className={cn(
                    "absolute right-3 top-3 flex items-center gap-1.5 rounded-lg bg-canvas/70 px-2 py-1.5 backdrop-blur-sm",
                    current === "logo" && "outline outline-1 outline-offset-4 outline-dashed outline-accent/70",
                  )}
                >
                  <Image
                    src={post.logoSrc}
                    alt={`Logo ${post.shortLogoName}`}
                    width={27}
                    height={27}
                    className="hidden rounded object-cover sm:block"
                  />
                  <span className="text-[10px] font-bold tracking-[0.08em] text-ivory">{post.shortLogoName}</span>
                </m.div>
              )}
            </AnimatePresence>
            {current === "logo" && (
              <span className="absolute right-3 top-16 hidden rounded bg-canvas/80 px-1.5 py-0.5 font-mono text-[10px] text-accent sm:block">
                logo gốc · vùng an toàn
              </span>
            )}

            {/* Nút chuyển bài đặt ở 2 bên giữa khung ảnh để thao tác nhanh trên mọi màn hình */}
            {totalPosts > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => stepPost(-1)}
                  aria-label="Bài mẫu trước"
                  className="absolute left-2 top-1/2 z-20 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-line-strong bg-canvas/80 text-fg shadow-lg backdrop-blur-md transition-colors hover:border-accent hover:text-accent active:scale-95"
                >
                  <ChevronLeft size={18} strokeWidth={2} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => stepPost(1)}
                  aria-label="Bài mẫu tiếp theo"
                  className="absolute right-2 top-1/2 z-20 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-line-strong bg-canvas/80 text-fg shadow-lg backdrop-blur-md transition-colors hover:border-accent hover:text-accent active:scale-95"
                >
                  <ChevronRight size={18} strokeWidth={2} aria-hidden />
                </button>
              </>
            )}
          </div>

          {/* Hàng tương tác */}
          <footer className="px-4 pb-3 pt-2.5">
            <div className="flex h-5 items-center justify-between text-[12px] text-fg-3">
              <AnimatePresence>
                {published && (
                  <m.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-1.5"
                  >
                    <span className="flex size-4 items-center justify-center rounded-full bg-[#1877F2]">
                      <ThumbsUp size={9} strokeWidth={2.5} className="text-white" aria-hidden />
                    </span>
                    {post.likes}
                  </m.span>
                )}
              </AnimatePresence>
              {published && <span>{post.comments} bình luận · {post.shares} lượt chia sẻ</span>}
            </div>
            <div className="mt-2.5 grid grid-cols-3 border-t border-line pt-1.5 text-[13px] text-fg-2">
              {[
                { icon: ThumbsUp, label: "Thích" },
                { icon: MessageCircle, label: "Bình luận" },
                { icon: Share2, label: "Chia sẻ" },
              ].map(({ icon: Icon, label }) => (
                <span key={label} className="flex items-center justify-center gap-1.5 py-1.5">
                  <Icon size={15} strokeWidth={1.5} aria-hidden />
                  <span className="hidden sm:inline">{label}</span>
                </span>
              ))}
            </div>
          </footer>
        </article>

        {/* Thanh tiến trình */}
        <ol className="mt-2.5 grid grid-cols-4 gap-1.5 px-1 pb-1" aria-label="Trạng thái bài đăng">
          {stages.map((s, i) => (
            <li key={s.key} className="min-w-0">
              <div className="h-[3px] overflow-hidden rounded-full bg-white/[0.08]">
                <m.div
                  className="h-full origin-left bg-accent"
                  initial={false}
                  animate={{ scaleX: i <= stage ? 1 : 0 }}
                  transition={{ duration: 0.5, ease: easeOutExpo }}
                />
              </div>
              <p
                className={cn(
                  "mt-1.5 text-[10px] leading-tight tracking-[-0.02em] transition-colors duration-300 sm:truncate sm:text-[10.5px] sm:tracking-normal",
                  i === stage ? "text-fg" : "text-fg-3",
                )}
              >
                {s.label}
              </p>
            </li>
          ))}
        </ol>
          </m.div>
        </AnimatePresence>

        {/* Thẻ nổi xác nhận đăng */}
        <AnimatePresence>
          {published && (
            <m.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.35, ease: easeOutExpo }}
              className="pointer-events-none absolute bottom-2 left-2 z-20 flex items-center gap-2.5 rounded-xl border border-line-accent bg-elevated/95 px-3.5 py-2.5 backdrop-blur sm:-left-6"
            >
              <span className="flex size-6 items-center justify-center rounded-md bg-accent text-canvas">
                <Check size={14} strokeWidth={2.25} aria-hidden />
              </span>
              <span className="text-[12.5px] leading-tight">
                <span className="block font-semibold text-fg">Đã đăng đúng 19:00</span>
                <span className="font-mono text-[11px] text-fg-3">khách duyệt bằng 1 chạm</span>
              </span>
            </m.div>
          )}
        </AnimatePresence>
      </div>

      {/* Chỉ báo vị trí bài mẫu gọn ở dưới */}
      {totalPosts > 1 && (
        <div className="mt-2 flex items-center justify-center gap-2 px-1">
          <div className="flex items-center gap-1">
            {heroMockPosts.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                onClick={() => selectPost(idx)}
                aria-label={`Xem bài mẫu ${idx + 1}: ${item.shortLogoName}`}
                aria-current={idx === cursor.postIndex ? "true" : undefined}
                className="inline-flex min-h-[44px] items-center justify-center px-1"
              >
                <span
                  className={cn(
                    "block h-1.5 rounded-full transition-all duration-300",
                    idx === cursor.postIndex ? "w-6 bg-accent" : "w-1.5 bg-line-strong hover:bg-fg-3",
                  )}
                />
              </button>
            ))}
          </div>
          <span className="truncate font-mono text-[11px] text-fg-3">
            {cursor.postIndex + 1}/{totalPosts} · {post.shortLogoName}
          </span>
        </div>
      )}
    </div>
  );
}

function Caption({ text, typing }: { text: string; typing: boolean }) {
  // Luôn render đủ chữ ở lần đầu để HTML server và client khớp nhau; hiệu ứng gõ chạy sau khi mount.
  const [count, setCount] = useState(text.length);

  useEffect(() => {
    if (!typing) {
      setCount(text.length);
      return;
    }
    setCount(0);
    const step = Math.ceil(text.length / 60);
    const id = window.setInterval(() => {
      setCount((c) => {
        if (c >= text.length) {
          window.clearInterval(id);
          return c;
        }
        return Math.min(text.length, c + step);
      });
    }, 30);
    return () => window.clearInterval(id);
  }, [typing, text]);

  return (
    <div className="relative min-w-0 px-4 pt-3 text-[14px] leading-[1.55] text-fg/90">
      {/* Giữ chiều cao cố định theo bài mẫu dài nhất để khung không nhảy khi chuyển bài hoặc gõ */}
      <div className="pointer-events-none invisible grid" aria-hidden>
        {heroMockPosts.map((item) => (
          <p key={item.id} className="col-start-1 row-start-1 break-words whitespace-pre-line">
            {item.caption}
          </p>
        ))}
      </div>
      <p className="absolute inset-x-4 top-3 break-words whitespace-pre-line">
        {text.slice(0, count)}
        {typing && count < text.length && (
          <span className="ml-0.5 inline-block h-[1em] w-px translate-y-[2px] animate-pulse bg-accent" />
        )}
      </p>
      <span className="sr-only">{text}</span>
    </div>
  );
}
