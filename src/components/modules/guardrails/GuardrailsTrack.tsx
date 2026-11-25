"use client";

import { FileCheck2, ShieldCheck, Sparkles, Stamp, type LucideIcon } from "lucide-react";
import { m, useMotionValue, useMotionValueEvent, useScroll, useTransform } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Reveal } from "@/components/motion/Reveal";
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
const VERTICAL_PER_HORIZONTAL = 1.5;

function GuardrailCard({ item, className }: { item: GuardrailItem; className?: string }) {
  const Icon = icons[item.key];
  return (
    <div
      className={cn(
        "group flex h-full flex-col rounded-2xl border border-line bg-surface/50 p-7 transition-colors duration-200 hover:border-line-strong hover:bg-surface md:p-8",
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
 * Máy tính (useHeavyMotion): section được ghim, 4 thẻ trượt ngang khi cuộn dọc, kèm bộ đếm "01 / 04".
 * Điện thoại, giảm chuyển động, SSR: lưới 2 cột như cũ.
 */
export function GuardrailsTrack({ items, header }: { items: GuardrailItem[]; header: ReactNode }) {
  const heavy = useHeavyMotion();
  if (!heavy) {
    return (
      <div className="mx-auto max-w-7xl px-5 py-24 md:px-8 md:py-32">
        {header}
        <div className="mt-14 grid gap-4 md:grid-cols-2">
          {items.map((item, idx) => (
            <Reveal key={item.key} delay={idx * 0.06}>
              <GuardrailCard item={item} />
            </Reveal>
          ))}
        </div>
      </div>
    );
  }
  return <PinnedTrack items={items} header={header} />;
}

function PinnedTrack({ items, header }: { items: GuardrailItem[]; header: ReactNode }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const distance = useMotionValue(0);
  const [height, setHeight] = useState<number | null>(null);
  const [active, setActive] = useState(0);

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
  const x = useTransform(() => -scrollYProgress.get() * distance.get());

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    setActive(Math.min(items.length - 1, Math.floor(p * items.length)));
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
          className="mt-12 flex w-max gap-5 pl-[max(32px,calc((100vw-80rem)/2+32px))] pr-[max(32px,calc((100vw-80rem)/2+32px))]"
        >
          {items.map((item, idx) => (
            <GuardrailCard
              key={item.key}
              item={item}
              className={cn(
                "w-[min(560px,42vw)] shrink-0 transition-[border-color,background-color] duration-300",
                idx === active && "border-line-accent bg-surface",
              )}
            />
          ))}
        </m.div>
      </div>
    </div>
  );
}
