import { CopyCheck, MessageSquareWarning, Timer, type LucideIcon } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { painPointsContent } from "@/data/pain-points";

const icons: Record<(typeof painPointsContent.items)[number]["icon"], LucideIcon> = {
  timer: Timer,
  voice: MessageSquareWarning,
  template: CopyCheck,
};

export function PainPointsSection() {
  const { eyebrow, title, description, items } = painPointsContent;
  return (
    <section aria-labelledby="pain-title" className="border-b border-line py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <SectionHeader index="01" eyebrow={eyebrow} title={title} description={description} id="pain-title" />

        <div className="mt-14 grid overflow-hidden rounded-2xl border border-line md:grid-cols-3">
          {items.map((item, i) => {
            const Icon = icons[item.icon];
            return (
              <Reveal
                key={item.title}
                delay={i * 0.08}
                className="group relative flex flex-col border-line bg-surface/40 p-7 transition-colors duration-200 hover:bg-surface max-md:not-first:border-t md:not-first:border-l md:p-8"
              >
                <div className="flex items-center justify-between">
                  <span className="flex size-10 items-center justify-center rounded-xl border border-line text-fg-2 transition-colors duration-200 group-hover:border-line-accent group-hover:text-accent">
                    <Icon size={19} strokeWidth={1.5} aria-hidden />
                  </span>
                  <span className="font-mono text-[12px] text-fg-3">0{i + 1}</span>
                </div>
                <h3 className="mt-6 text-lg font-semibold tracking-[-0.015em] text-fg">{item.title}</h3>
                <p className="mt-3 flex-1 text-[15px] leading-relaxed text-fg-2">{item.body}</p>
                <p className="mt-6 inline-flex w-fit items-center gap-2 rounded-md border border-line px-2.5 py-1 font-mono text-[11.5px] text-fg-3">
                  <span aria-hidden className="size-1.5 rounded-full bg-red-400/70" />
                  {item.symptom}
                </p>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
