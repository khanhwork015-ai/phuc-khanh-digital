"use client";

import { AlertCircle, Check, Sparkles, X } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useState } from "react";
import { Reveal } from "@/components/motion/Reveal";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  captionSamples,
  showcaseContent,
  visualSamples,
  type ShowcaseTab,
  type VisualSample,
} from "@/data/showcase-samples";
import { easeOutExpo } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function ShowcaseBeforeAfter() {
  const [tab, setTab] = useState<ShowcaseTab>("caption");
  const [sampleIdx, setSampleIdx] = useState(0);
  const activeSample = captionSamples[sampleIdx];

  return (
    <section id="san-pham-mau" aria-labelledby="showcase-title" className="border-b border-line py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <SectionHeader
            index="04"
            eyebrow={showcaseContent.eyebrow}
            title={showcaseContent.title}
            description={showcaseContent.description}
            id="showcase-title"
          />

          {/* Bộ chuyển 2 tab */}
          <Reveal delay={0.08} className="shrink-0">
            <div
              role="tablist"
              aria-label="Loại sản phẩm mẫu"
              className="inline-flex rounded-xl border border-line bg-surface p-1"
            >
              {showcaseContent.tabs.map((t) => {
                const active = tab === t.key;
                return (
                  <button
                    key={t.key}
                    id={`showcase-tab-${t.key}`}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    aria-controls={`showcase-panel-${t.key}`}
                    onClick={() => setTab(t.key)}
                    className={cn(
                      "relative rounded-lg px-4 py-2 text-[14px] font-medium transition-colors duration-200",
                      active ? "text-canvas" : "text-fg-2 hover:text-fg",
                    )}
                  >
                    {active && (
                      <m.span
                        layoutId="showcase-tab"
                        transition={{ type: "spring", stiffness: 380, damping: 32 }}
                        className="absolute inset-0 rounded-lg bg-accent"
                      />
                    )}
                    <span className="relative z-10">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </Reveal>
        </div>

        <div
          role="tabpanel"
          id={`showcase-panel-${tab}`}
          aria-labelledby={`showcase-tab-${tab}`}
          className="mt-12"
        >
          <AnimatePresence mode="wait" initial={false}>
            {tab === "caption" ? (
              <m.div
                key="caption-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: easeOutExpo }}
              >
                {/* Chọn ngành hàng mẫu */}
                <div className="mb-6 flex flex-wrap items-center gap-2">
                  <span className="mr-1 font-mono text-[12px] text-fg-3">Ngành mẫu:</span>
                  {captionSamples.map((s, idx) => {
                    const selected = idx === sampleIdx;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSampleIdx(idx)}
                        className={cn(
                          "rounded-lg border px-3 py-1.5 text-[13.5px] transition-colors duration-200",
                          selected
                            ? "border-line-accent bg-accent-muted text-ivory"
                            : "border-line bg-surface/50 text-fg-2 hover:border-line-strong hover:text-fg",
                        )}
                      >
                        {s.industry}
                      </button>
                    );
                  })}
                </div>

                {/* Khung so sánh 2 cột */}
                <AnimatePresence mode="wait" initial={false}>
                  <m.div
                    key={activeSample.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.22, ease: easeOutExpo }}
                    className="grid overflow-hidden rounded-2xl border border-line lg:grid-cols-2"
                  >
                    {/* Cột trái: Before */}
                    <article className="flex flex-col border-line bg-surface/35 p-6 md:p-8 max-lg:border-b lg:border-r">
                      <header className="flex items-center justify-between gap-3 border-b border-line pb-4">
                        <div className="flex items-center gap-2">
                          <span className="flex size-6 items-center justify-center rounded-md border border-red-400/30 bg-red-400/10 text-red-300">
                            <X size={13} strokeWidth={2} aria-hidden />
                          </span>
                          <span className="text-[14px] font-semibold text-fg-2">{activeSample.before.label}</span>
                        </div>
                        <span className="font-mono text-[11.5px] text-fg-3">Trước</span>
                      </header>

                      <p className="mt-5 whitespace-pre-line text-[14.5px] leading-[1.65] text-fg-2">
                        {activeSample.before.text}
                      </p>

                      <ul className="mt-auto space-y-2 border-t border-line pt-5">
                        {activeSample.before.issues.map((issue) => (
                          <li key={issue} className="flex items-start gap-2.5 text-[13.5px] text-fg-3">
                            <AlertCircle size={15} strokeWidth={1.5} className="mt-0.5 shrink-0 text-red-400/80" aria-hidden />
                            {issue}
                          </li>
                        ))}
                      </ul>
                    </article>

                    {/* Cột phải: After */}
                    <article className="flex flex-col bg-surface p-6 md:p-8">
                      <header className="flex items-center justify-between gap-3 border-b border-line pb-4">
                        <div className="flex items-center gap-2">
                          <span className="flex size-6 items-center justify-center rounded-md border border-line-accent bg-accent-muted text-accent">
                            <Sparkles size={13} strokeWidth={1.75} aria-hidden />
                          </span>
                          <span className="text-[14px] font-semibold text-ivory">{activeSample.after.label}</span>
                        </div>
                        <span className="rounded-md border border-line-accent bg-accent-muted px-2 py-0.5 font-mono text-[11px] text-accent">
                          {activeSample.brandName}
                        </span>
                      </header>

                      <p className="mt-5 whitespace-pre-line text-[15px] leading-[1.7] text-fg">
                        {activeSample.after.text}
                      </p>

                      <ul className="mt-auto space-y-2 border-t border-line pt-5">
                        {activeSample.after.highlights.map((item) => (
                          <li key={item} className="flex items-start gap-2.5 text-[13.5px] text-fg-2">
                            <Check size={15} strokeWidth={2} className="mt-0.5 shrink-0 text-accent" aria-hidden />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </article>
                  </m.div>
                </AnimatePresence>
              </m.div>
            ) : (
              <m.div
                key="visual-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: easeOutExpo }}
                className="grid gap-6 md:grid-cols-2"
              >
                {visualSamples.map((item) => (
                  <VisualSampleCard key={item.id} item={item} />
                ))}
              </m.div>
            )}
          </AnimatePresence>
          <p className="mt-6 text-[12.5px] text-fg-3">{showcaseContent.note}</p>
        </div>
      </div>
    </section>
  );
}

const logoPosClass: Record<VisualSample["logoPosition"], string> = {
  "top-right": "right-4 top-4",
  "top-left": "left-4 top-4",
  "bottom-right": "right-4 bottom-4",
};

function VisualSampleCard({ item }: { item: VisualSample }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-surface transition-colors duration-200 hover:border-line-strong">
      {/* Khung ảnh mô phỏng ánh sáng tự nhiên & vùng an toàn logo gốc */}
      <div
        className="relative aspect-[16/10] overflow-hidden border-b border-line"
        style={{ background: item.palette.bg }}
      >
        {/* Vệt sáng tự nhiên */}
        <div
          aria-hidden
          className="absolute -left-12 -top-12 h-[140%] w-1/2 rotate-[20deg] blur-2xl"
          style={{ background: item.palette.accent, opacity: 0.14 }}
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-[38%] border-t border-white/10"
          style={{ background: item.palette.surface }}
        />
        {/* Khung lưới tỉ lệ phụ */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-4 rounded-lg border border-dashed border-white/15"
        />

        {/* Vùng an toàn logo gốc */}
        <div
          className={cn(
            "absolute flex items-center gap-1.5 rounded-lg border border-dashed border-accent/70 bg-canvas/80 px-2.5 py-1.5 backdrop-blur-sm",
            logoPosClass[item.logoPosition],
          )}
        >
          <span className="size-2 rounded-[2px]" style={{ background: item.palette.accent }} aria-hidden />
          <span className="font-mono text-[10.5px] font-bold tracking-[0.08em] text-ivory">{item.logoLabel}</span>
        </div>

        {/* Chữ tiếng Việt trên ảnh */}
        <div
          className={cn(
            "absolute bottom-4 left-4 right-4 sm:bottom-5 sm:left-6 sm:right-6",
            item.logoPosition === "bottom-right" && "pr-24",
          )}
        >
          <p className="text-lg font-bold leading-snug tracking-[-0.015em]" style={{ color: item.palette.text }}>
            {item.photoTitle}
          </p>
          <p className="mt-1 font-mono text-[11.5px]" style={{ color: item.palette.accent }}>
            {item.photoSub}
          </p>
        </div>
      </div>

      <div className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold tracking-[-0.01em] text-fg">{item.brandName}</h3>
          <span className="font-mono text-[11.5px] text-fg-3">{item.industry}</span>
        </div>
        <p className="mt-2 font-mono text-[12px] text-accent">{item.aspectNote}</p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {item.checks.map((check) => (
            <li
              key={check}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-canvas/60 px-2.5 py-1 text-[12.5px] text-fg-2"
            >
              <Check size={12} strokeWidth={2} className="text-accent" aria-hidden />
              {check}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
