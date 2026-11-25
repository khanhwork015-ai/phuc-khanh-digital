"use client";

import { ArrowDown } from "lucide-react";
import { m, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { useRef, type ReactNode } from "react";
import { useHeavyMotion } from "@/components/motion/useHeavyMotion";

type HeroScrollStageProps = { text: ReactNode; visual: ReactNode; bell: ReactNode };

/**
 * Sân khấu Hero kiểu studio:
 * - Desktop (>= 1024px): ghim 100vh trong vùng cuộn 190vh, camera 3D zoom-in rồi zoom-out,
 *   chữ và mockup tách lớp parallax + thu phóng mượt theo cuộn, kèm chỉ dẫn cuộn ở đáy màn hình.
 * - Mobile (< 1024px): giữ chiều cao tự nhiên gọn gàng, vẫn có parallax + thu nhỏ nhẹ khi cuộn qua.
 */
export function HeroScrollStage({ text, visual, bell }: HeroScrollStageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const still = useReducedMotion() === true;
  const heavy = useHeavyMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.45 });

  const textY = useTransform(progress, [0, 1], still ? [0, 0] : heavy ? [0, -90] : [0, -28]);
  const textOpacity = useTransform(progress, [0, 0.65, 1], still ? [1, 1, 1] : [1, 1, 0.15]);

  const visualY = useTransform(progress, [0, 0.45, 1], still ? [0, 0, 0] : heavy ? [0, -20, -135] : [0, -12, -45]);
  const visualScale = useTransform(progress, [0, 0.4, 1], still ? [1, 1, 1] : heavy ? [1, 1.045, 0.88] : [1, 1.01, 0.94]);

  const stageScale = useTransform(progress, [0, 0.7, 1], still ? [1, 1, 1] : heavy ? [1, 0.99, 0.93] : [1, 0.98, 0.95]);
  const cueOpacity = useTransform(progress, [0, 0.12], still ? [0, 0] : [1, 0]);

  return (
    <div ref={ref} className="relative lg:h-[185vh]">
      <div className="relative flex min-h-[calc(100svh-4rem)] flex-col justify-center overflow-hidden py-16 pt-24 lg:sticky lg:top-0 lg:h-screen lg:py-0 lg:pt-16">
        {/* Sân khấu 3D toàn màn hình phía sau/bên phải */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-[14%] top-[6%] -z-10 aspect-[612/530] w-[78vw] max-w-[420px] opacity-80 sm:w-[58vw] lg:right-[-4%] lg:top-1/2 lg:w-[54vw] lg:max-w-[760px] lg:-translate-y-1/2 lg:opacity-95"
        >
          {bell}
        </div>

        <m.div
          style={{ scale: stageScale }}
          className="mx-auto grid w-full max-w-7xl items-center gap-12 px-5 md:px-8 lg:grid-cols-[54fr_46fr] lg:gap-12"
        >
          <m.div style={{ y: textY, opacity: textOpacity }} className="max-w-2xl">
            {text}
          </m.div>

          <m.div
            style={{ y: visualY, scale: visualScale }}
            className="relative mx-auto w-full max-w-[460px] lg:ml-auto lg:max-w-[470px]"
          >
            {visual}
          </m.div>
        </m.div>

        {/* Chỉ dẫn cuộn kiểu studio (chỉ hiện ở đầu trang, mờ dần ngay khi cuộn) */}
        <m.div
          aria-hidden
          style={{ opacity: cueOpacity }}
          className="pointer-events-none absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 lg:flex"
        >
          <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-fg-3">Cuộn để khám phá</span>
          <span className="flex size-7 items-center justify-center rounded-full border border-line bg-surface/60 text-accent backdrop-blur-sm">
            <ArrowDown size={13} className="animate-bounce" />
          </span>
        </m.div>
      </div>
    </div>
  );
}
