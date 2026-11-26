"use client";

import { CalendarClock, Check, Globe2, MessageCircle, PenLine, Share2, ThumbsUp } from "lucide-react";
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

export function HeroPostMockup() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-40px" });
  const reduce = useReducedMotion();
  const [cursor, setCursor] = useState({ postIndex: 0, stage: 0 });
  const stages = heroMockPost.stages;
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
      setCursor({ postIndex: picked, stage: 0 });
    }
  }, []);

  useEffect(() => {
    if (!inView) return;
    const id = window.setInterval(() => {
      setCursor((prev) => {
        if (prev.stage + 1 < stages.length) {
          return { postIndex: prev.postIndex, stage: prev.stage + 1 };
        }
        return { postIndex: pickNextDifferentBrandIndex(prev.postIndex), stage: 0 };
      });
    }, STAGE_MS);
    return () => window.clearInterval(id);
  }, [inView, stages.length]);

  const showImage = current !== "writing";
  const showLogo = current !== "writing";
  const published = current === "published";

  return (
    // Hình minh họa động, không có gì để tương tác: inert để trình đọc màn hình bỏ qua
    // (mô tả bằng lời nằm ở HeroSection) và để công cụ kiểm tra không đo tương phản lúc chữ đang mờ dần.
    <div ref={ref} className="relative" inert>
      {/* Khung kính */}
      <div className="rounded-2xl border border-line-strong bg-white/[0.03] p-2.5 backdrop-blur-md">
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
      </div>

      {/* Thẻ nổi xác nhận đăng */}
      <AnimatePresence>
        {published && (
          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.35, ease: easeOutExpo }}
            className="absolute -bottom-5 left-2 flex items-center gap-2.5 rounded-xl border border-line-accent bg-elevated/95 px-3.5 py-2.5 backdrop-blur sm:-left-6"
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
    <p className="relative min-w-0 break-words whitespace-pre-line px-4 pt-3 text-[14px] leading-[1.55] text-fg/90">
      {/* Giữ chiều cao cố định để khung không nhảy khi gõ */}
      <span className="invisible" aria-hidden>
        {text}
      </span>
      <span className="absolute inset-x-4 top-3">
        {text.slice(0, count)}
        {typing && count < text.length && (
          <span className="ml-0.5 inline-block h-[1em] w-px translate-y-[2px] animate-pulse bg-accent" />
        )}
      </span>
      <span className="sr-only">{text}</span>
    </p>
  );
}
