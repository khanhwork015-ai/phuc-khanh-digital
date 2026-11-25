import { FileCheck2, ShieldCheck, Sparkles, Stamp, type LucideIcon } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { guardrailItems, guardrailsContent, type GuardrailKey } from "@/data/guardrails";

const icons: Record<GuardrailKey, LucideIcon> = {
  spelling: FileCheck2,
  "clean-visual": Sparkles,
  "safe-logo": Stamp,
  "fact-check": ShieldCheck,
};

export function QualityGuardrailsSection() {
  return (
    <section aria-labelledby="guardrails-title" className="border-b border-line py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <SectionHeader
          index="05"
          eyebrow={guardrailsContent.eyebrow}
          title={guardrailsContent.title}
          description={guardrailsContent.description}
          id="guardrails-title"
        />

        <div className="mt-14 grid gap-4 md:grid-cols-2">
          {guardrailItems.map((item, idx) => {
            const Icon = icons[item.key];
            return (
              <Reveal
                key={item.key}
                delay={idx * 0.06}
                className="group flex flex-col rounded-2xl border border-line bg-surface/50 p-7 transition-colors duration-200 hover:border-line-strong hover:bg-surface md:p-8"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl border border-line bg-elevated text-fg-2 transition-colors duration-200 group-hover:border-line-accent group-hover:text-accent">
                      <Icon size={19} strokeWidth={1.5} aria-hidden />
                    </span>
                    <span className="rounded-md border border-line px-2.5 py-1 font-mono text-[11.5px] text-fg-3">
                      {item.badge}
                    </span>
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
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
