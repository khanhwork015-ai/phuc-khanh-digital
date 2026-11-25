"use client";

import { AnimatePresence, m } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useSmoothScroll } from "@/components/motion/SmoothScrollProvider";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { processContent, processSteps } from "@/data/process-steps";
import { easeOutExpo } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { ProcessPreview } from "./process/ProcessPreview";

/**
 * Desktop: danh sách 5 bước bên trái, cuộn tới bước nào thì bước đó sáng lên,
 * khung preview bên phải dính (sticky) và chuyển cảnh theo bước đang active.
 * Mobile: mỗi bước hiển thị kèm preview của chính nó, không cần tương tác.
 */
export function ProcessStepperSection() {
  const [active, setActive] = useState(0);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const scrollTo = useSmoothScroll();

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    if (!desktop.matches) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLElement).dataset.index);
            setActive(idx);
          }
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    itemRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  const step = processSteps[active];

  return (
    <section id="quy-trinh" aria-labelledby="process-title" className="border-b border-line py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <SectionHeader
          index="02"
          eyebrow={processContent.eyebrow}
          title={processContent.title}
          description={processContent.description}
          id="process-title"
        />

        <div className="mt-14 grid gap-12 lg:mt-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16">
          <ol className="relative">
            {/* Đường ray dọc */}
            <span aria-hidden className="absolute bottom-0 left-[19px] top-0 hidden w-px bg-line lg:block" />

            {processSteps.map((s, i) => {
              const isActive = i === active;
              return (
                <li
                  key={s.number}
                  ref={(el) => {
                    itemRefs.current[i] = el;
                  }}
                  data-index={i}
                  className="relative pb-12 last:pb-0 lg:flex lg:min-h-[44vh] lg:items-center lg:pb-0 lg:pl-14"
                >
                  {/* Chỉ báo active trượt bằng layoutId */}
                  {isActive && (
                    <m.span
                      layoutId="process-indicator"
                      aria-hidden
                      transition={{ type: "spring", stiffness: 380, damping: 34 }}
                      className="absolute left-[18px] top-1/2 hidden h-24 w-[3px] -translate-y-1/2 rounded-full bg-accent lg:block"
                    />
                  )}

                  {/* Bước chưa active: đổi màu chữ thay vì làm mờ, để vẫn đạt độ tương phản WCAG AA */}
                  <div className="group/step w-full">
                    <button
                      type="button"
                      onClick={() => {
                        setActive(i);
                        const el = itemRefs.current[i];
                        if (el) scrollTo(el);
                      }}
                      aria-current={isActive ? "step" : undefined}
                      className="w-full rounded-xl text-left lg:cursor-pointer"
                    >
                      <span
                        className={cn(
                          "font-mono text-[12.5px] transition-colors duration-300",
                          isActive ? "text-accent" : "text-fg-3",
                        )}
                      >
                        Bước {s.number}
                      </span>
                      <h3
                        className={cn(
                          "mt-2 text-xl font-semibold tracking-[-0.02em] transition-colors duration-300 md:text-2xl",
                          isActive ? "text-fg" : "text-fg lg:text-fg-3 lg:group-hover/step:text-fg-2",
                        )}
                      >
                        {s.title}
                      </h3>
                      <p
                        className={cn(
                          "mt-3 max-w-lg text-[15px] leading-relaxed transition-colors duration-300",
                          isActive ? "text-fg-2" : "text-fg-2 lg:text-fg-3",
                        )}
                      >
                        {s.body}
                      </p>
                    </button>
                    <ul className="mt-5 space-y-2">
                      {s.points.map((p) => (
                        <li
                          key={p}
                          className={cn(
                            "flex items-start gap-2.5 text-[14px] transition-colors duration-300",
                            isActive ? "text-fg-2" : "text-fg-2 lg:text-fg-3",
                          )}
                        >
                          <span aria-hidden className="mt-[9px] h-px w-3 shrink-0 bg-fg-3" />
                          {p}
                        </li>
                      ))}
                    </ul>

                    {/* Preview cho mobile/tablet */}
                    <div className="mt-6 lg:hidden">
                      <ProcessPreview preview={s.preview} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>

          {/* Preview dính cho desktop */}
          <div className="hidden lg:block">
            <div className="sticky top-[calc(50vh-210px)]">
              <div className="mb-4 flex items-center gap-3">
                <span className="font-mono text-[12px] text-fg-3">
                  {String(active + 1).padStart(2, "0")} / {String(processSteps.length).padStart(2, "0")}
                </span>
                <div className="flex flex-1 gap-1">
                  {processSteps.map((s, i) => (
                    <span
                      key={s.number}
                      className={cn(
                        "h-[3px] flex-1 rounded-full transition-colors duration-300",
                        i <= active ? "bg-accent" : "bg-white/[0.08]",
                      )}
                    />
                  ))}
                </div>
              </div>
              <AnimatePresence mode="wait" initial={false}>
                <m.div
                  key={step.preview}
                  initial={{ opacity: 0, y: 8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: easeOutExpo }}
                >
                  <ProcessPreview preview={step.preview} />
                </m.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
