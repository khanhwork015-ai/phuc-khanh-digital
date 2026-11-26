"use client";

import { FileCheck2, ShieldCheck, Sparkles, Stamp, type LucideIcon } from "lucide-react";
import { m, useMotionValue, useMotionValueEvent, useScroll, useSpring, useTransform } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
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
        "group flex flex-col self-stretch rounded-2xl border border-line bg-surface/55 p-6 transition-all duration-300 hover:border-line-strong hover:bg-surface md:p-8",
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
 * Dùng chung cho mọi kích thước màn hình:
 * Section ghim toàn màn hình, cuộn dọc sẽ tự động trượt ngang các thẻ cho tới thẻ cuối cùng
 * rồi mới tiếp tục cuộn dọc xuống bên dưới — không dùng overflow-x để tránh xung đột cuộn ngang/dọc.
 */
export function GuardrailsTrack({ items, header }: { items: GuardrailItem[]; header: ReactNode }) {
  return <PinnedTrack items={items} header={header} />;
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
      <div className="sticky top-0 flex h-[100svh] flex-col justify-center overflow-hidden pb-6 pt-20 md:h-screen md:py-16">
        <div className="mx-auto flex w-full max-w-7xl items-end justify-between gap-4 px-5 md:gap-10 md:px-8">
          {header}
          <p className="shrink-0 pb-1 font-mono text-[12.5px] text-fg-3 md:pb-2 md:text-[13px]" aria-live="polite">
            <span className="text-accent">{String(active + 1).padStart(2, "0")}</span> / {String(items.length).padStart(2, "0")}
          </p>
        </div>

        <m.div
          ref={trackRef}
          style={{ x }}
          className="mt-6 flex w-max items-stretch gap-4 pl-5 pr-5 md:mt-12 md:gap-6 md:pl-[max(32px,calc((100vw-80rem)/2+32px))] md:pr-[max(32px,calc((100vw-80rem)/2+32px))]"
        >
          {items.map((item, idx) => (
            <GuardrailCard
              key={item.key}
              item={item}
              className={cn(
                "w-[84vw] max-w-[380px] shrink-0 will-change-transform lg:w-[min(560px,42vw)] lg:max-w-none",
                idx === active
                  ? "border-line-accent bg-surface shadow-[0_0_50px_-18px_rgba(233,190,87,0.3)]"
                  : "opacity-80",
              )}
            />
          ))}
        </m.div>

        <div className="mx-auto mt-5 w-full max-w-7xl px-5 md:mt-8 md:px-8">
          <div className="h-[2px] w-full overflow-hidden rounded-full bg-white/[0.07]">
            <m.div style={{ scaleX: smoothProgress }} className="h-full origin-left bg-accent" />
          </div>
        </div>
      </div>
    </div>
  );
}
