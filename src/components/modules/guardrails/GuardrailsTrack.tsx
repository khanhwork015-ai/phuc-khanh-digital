"use client";

import { FileCheck2, ShieldCheck, Sparkles, Stamp, type LucideIcon } from "lucide-react";
import { m, useMotionValue, useMotionValueEvent, useScroll, useSpring, useTransform } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useHeavyMotion } from "@/components/motion/useHeavyMotion";
import type { GuardrailItem, GuardrailKey } from "@/data/guardrails";
import { cn } from "@/lib/utils";

const icons: Record<GuardrailKey, LucideIcon> = {
  spelling: FileCheck2,
  "clean-visual": Sparkles,
  "safe-logo": Stamp,
  "fact-check": ShieldCheck,
};

/** Mỗi px cuộn ngang tương ứng bao nhiêu px cuộn dọc (lớn hơn = trượt chậm hơn). */
const VERTICAL_PER_HORIZONTAL = 1.45;

function GuardrailCard({ item, className }: { item: GuardrailItem; className?: string }) {
  const Icon = icons[item.key];
  return (
    <div
      className={cn(
        "group flex h-full flex-col rounded-2xl border border-line bg-surface/55 p-6 transition-all duration-300 hover:border-line-strong hover:bg-surface md:p-8",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl border border-line bg-elevated text-fg-2 transition-colors duration-200 group-hover:border-line-accent group-hover:text-accent">
            <Icon size={19} strokeWidth={1.5} aria-hidden />
          </span>
          <span className="rounded-md border border-line px-2.5 py-1 font-mono text-[11.5px] text-fg-3">{item.badge}</span>
        </div>
        <span className="font-mono text-[12px] text-fg-3">{item.number}</span>
      </div>

      <h3 className="mt-6 text-lg font-semibold tracking-[-0.015em] text-fg md:text-xl">{item.title}</h3>
      <p className="mt-3 flex-1 text-[15px] leading-relaxed text-fg-2">{item.description}</p>

      <ul className="mt-6 flex flex-wrap gap-2 border-t border-line pt-5">
        {item.checks.map((c) => (
          <li
            key={c}
            className="inline-flex items-center gap-2 rounded-lg border border-line bg-canvas/60 px-3 py-1 text-[12.5px] text-fg-2"
          >
            <span aria-hidden className="size-1.5 rounded-[2px] bg-accent" />
            {c}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Máy tính (useHeavyMotion): section ghim toàn màn hình, 4 thẻ trượt ngang mượt theo cuộn dọc (spring),
 * thẻ ở tâm nổi bật, kèm bộ đếm "01 / 04" và thanh tiến trình.
 * Mobile/Tablet (< 1024px): carousel vuốt ngang snap-center mượt 60fps kèm bộ đếm & thanh tiến trình.
 */
export function GuardrailsTrack({ items, header }: { items: GuardrailItem[]; header: ReactNode }) {
  const heavy = useHeavyMotion();
  if (!heavy) {
    return <MobileSnapTrack items={items} header={header} />;
  }
  return <PinnedTrack items={items} header={header} />;
}

function MobileSnapTrack({ items, header }: { items: GuardrailItem[]; header: ReactNode }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [ratio, setRatio] = useState(1 / items.length);

  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = Math.max(1, el.scrollWidth - el.clientWidth);
    const p = Math.min(1, Math.max(0, el.scrollLeft / max));
    setActive(Math.min(items.length - 1, Math.round(p * (items.length - 1))));
    setRatio(1 / items.length + p * (1 - 1 / items.length));
  };

  return (
    <div className="py-20 md:py-28">
      <div className="mx-auto flex max-w-7xl items-end justify-between gap-6 px-5 md:px-8">
        {header}
        <p className="shrink-0 pb-1 font-mono text-[12.5px] text-fg-3" aria-live="polite">
          <span className="text-accent">{String(active + 1).padStart(2, "0")}</span> / {String(items.length).padStart(2, "0")}
        </p>
      </div>

      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:px-8"
      >
        {items.map((item, idx) => (
          <GuardrailCard
            key={item.key}
            item={item}
            className={cn(
              "w-[84vw] max-w-[380px] shrink-0 snap-center",
              idx === active && "border-line-accent bg-surface",
            )}
          />
        ))}
      </div>

      <div className="mx-auto mt-3 flex max-w-7xl items-center gap-4 px-5 md:px-8">
        <div className="h-[2px] flex-1 overflow-hidden rounded-full bg-white/[0.08]">
          <div
            className="h-full origin-left bg-accent transition-transform duration-150 ease-out"
            style={{ transform: `scaleX(${ratio})` }}
          />
        </div>
        <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-3">Vuốt ngang</span>
      </div>
    </div>
  );
}

function PinnedTrack({ items, header }: { items: GuardrailItem[]; header: ReactNode }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const distance = useMotionValue(0);
  const [height, setHeight] = useState<number | null>(null);
  const [active, setActive] = useState(0);

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 130, damping: 28, mass: 0.4 });
  const x = useTransform(() => -smoothProgress.get() * distance.get());

  useMotionValueEvent(smoothProgress, "change", (p) => {
    setActive(Math.min(items.length - 1, Math.floor(Math.max(0, p) * items.length)));
  });

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const measure = () => {
      const d = Math.max(0, track.scrollWidth - window.innerWidth);
      distance.set(d);
      setHeight(window.innerHeight + d * VERTICAL_PER_HORIZONTAL);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [distance]);

  return (
    <div ref={sectionRef} className="relative" style={{ height: height ?? "300vh" }}>
      <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden py-16">
        <div className="mx-auto flex w-full max-w-7xl items-end justify-between gap-10 px-8">
          {header}
          <p className="shrink-0 pb-2 font-mono text-[13px] text-fg-3" aria-live="polite">
            <span className="text-accent">{String(active + 1).padStart(2, "0")}</span> / {String(items.length).padStart(2, "0")}
          </p>
        </div>

        <m.div
          ref={trackRef}
          style={{ x }}
          className="mt-12 flex w-max gap-6 pl-[max(32px,calc((100vw-80rem)/2+32px))] pr-[max(32px,calc((100vw-80rem)/2+32px))]"
        >
          {items.map((item, idx) => (
            <GuardrailCard
              key={item.key}
              item={item}
              className={cn(
                "w-[min(560px,42vw)] shrink-0 will-change-transform",
                idx === active
                  ? "scale-[1.02] border-line-accent bg-surface shadow-[0_0_50px_-18px_rgba(233,190,87,0.3)]"
                  : "scale-[0.96] opacity-75",
              )}
            />
          ))}
        </m.div>

        <div className="mx-auto mt-8 w-full max-w-7xl px-8">
          <div className="h-[2px] w-full overflow-hidden rounded-full bg-white/[0.07]">
            <m.div style={{ scaleX: smoothProgress }} className="h-full origin-left bg-accent" />
          </div>
        </div>
      </div>
    </div>
  );
}
