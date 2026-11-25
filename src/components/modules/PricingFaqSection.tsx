"use client";

import { ArrowRight, Check, ChevronDown } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useState } from "react";
import { Parallax } from "@/components/motion/Parallax";
import { Reveal } from "@/components/motion/Reveal";
import { ScrollScale } from "@/components/motion/ScrollScale";
import { useSmoothScroll } from "@/components/motion/SmoothScrollProvider";
import { TiltCard } from "@/components/modules/hero/TiltCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { faqContent, faqItems } from "@/data/faq";
import { PRICING_CONFIG, pricingContent } from "@/data/pricing";
import type { LeadPlanValue } from "@/lib/lead-fields";
import { easeOutExpo } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function PricingFaqSection() {
  const [openFaq, setOpenFaq] = useState<string | null>(faqItems[0]?.id ?? null);
  const scrollTo = useSmoothScroll();

  const selectPlan = (planId: LeadPlanValue) => {
    window.dispatchEvent(new CustomEvent<LeadPlanValue>("pkd:select-plan", { detail: planId }));
    scrollTo("#dang-ky-tu-van");
  };

  return (
    <section id="goi-van-hanh" aria-labelledby="pricing-title" className="border-b border-line py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <SectionHeader
          index="06"
          eyebrow={pricingContent.eyebrow}
          title={pricingContent.title}
          description={pricingContent.description}
          id="pricing-title"
        />

        {/* Bảng gói 3 cột */}
        <ScrollScale from={0.93} toExit={0.97} className="mt-14">
          <div className="grid gap-5 lg:grid-cols-3">
          {PRICING_CONFIG.map((plan, idx) => {
            const card = (
            <Reveal
              key={plan.id}
              delay={idx * 0.06}
              className={cn(
                "flex h-full flex-col rounded-2xl border p-7 transition-colors duration-200 md:p-8",
                plan.featured
                  ? "border-line-accent bg-surface"
                  : "border-line bg-surface/40 hover:border-line-strong",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="font-mono text-[11.5px] uppercase tracking-[0.1em] text-fg-3">
                    {plan.subtitle}
                  </span>
                  <h3 className="mt-1.5 text-xl font-semibold tracking-[-0.02em] text-fg">{plan.name}</h3>
                </div>
                {plan.badge && (
                  <span className="rounded-lg border border-line-accent bg-accent-muted px-2.5 py-1 text-[12px] font-medium text-accent">
                    {plan.badge}
                  </span>
                )}
              </div>

              <div className="mt-6 border-y border-line py-5">
                <p className="text-2xl font-bold tracking-[-0.02em] text-ivory">{plan.priceLabel}</p>
                <p className="mt-1 text-[13.5px] text-fg-3">{plan.billingNote}</p>
              </div>

              <p className="mt-5 text-[14.5px] leading-relaxed text-fg-2">{plan.summary}</p>

              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2.5 text-[14px] leading-snug text-fg-2">
                    <Check size={15} strokeWidth={2} className="mt-0.5 shrink-0 text-accent" aria-hidden />
                    {feat}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => selectPlan(plan.id)}
                className={cn(
                  "mt-8 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-[14.5px] font-semibold transition-[background-color,border-color,color,transform] duration-200 ease-out hover:-translate-y-px",
                  plan.featured
                    ? "bg-accent text-canvas hover:bg-accent-hover"
                    : "border border-line-strong bg-white/[0.02] text-fg hover:border-white/30 hover:bg-white/[0.05]",
                )}
              >
                {plan.ctaLabel}
                <ArrowRight size={15} strokeWidth={1.75} aria-hidden />
              </button>
            </Reveal>
            );
            // Gói Khuyên dùng nghiêng nhẹ theo chuột (chỉ máy tính) + parallax lệch pha giữa 3 thẻ
            const wrapped = plan.featured ? (
              <TiltCard maxDeg={4} className="h-full [&>div]:h-full">
                {card}
              </TiltCard>
            ) : (
              card
            );
            return (
              <Parallax key={plan.id} distance={[-28, 18, -28][idx] ?? 0} className="h-full">
                {wrapped}
              </Parallax>
            );
          })}
          </div>
        </ScrollScale>

        <Reveal delay={0.12}>
          <p className="mt-6 text-[13.5px] text-fg-3">{pricingContent.note}</p>
        </Reveal>

        {/* FAQ Accordion */}
        <div className="mt-24 grid gap-10 border-t border-line pt-16 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-14">
          <Reveal>
            <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-accent">{faqContent.eyebrow}</p>
            <h3 className="mt-3 text-balance text-2xl font-bold leading-snug tracking-[-0.02em] text-fg md:text-3xl">
              {faqContent.title}
            </h3>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="overflow-hidden rounded-2xl border border-line bg-surface/40">
              {faqItems.map((item) => {
                const isOpen = openFaq === item.id;
                return (
                  <div key={item.id} className="border-b border-line last:border-b-0">
                    <button
                      id={`faq-btn-${item.id}`}
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={isOpen ? `faq-panel-${item.id}` : undefined}
                      onClick={() => setOpenFaq(isOpen ? null : item.id)}
                      className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors duration-200 hover:bg-white/[0.02]"
                    >
                      <span className="text-[15.5px] font-medium leading-snug text-fg">{item.question}</span>
                      <ChevronDown
                        size={18}
                        strokeWidth={1.5}
                        aria-hidden
                        className={cn(
                          "shrink-0 text-fg-3 transition-transform duration-200",
                          isOpen && "rotate-180 text-accent",
                        )}
                      />
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <m.div
                          id={`faq-panel-${item.id}`}
                          role="region"
                          aria-labelledby={`faq-btn-${item.id}`}
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.22, ease: easeOutExpo }}
                        >
                          <p className="px-6 pb-5 text-[14.5px] leading-relaxed text-fg-2">{item.answer}</p>
                        </m.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
