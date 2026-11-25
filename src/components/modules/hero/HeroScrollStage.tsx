"use client";

import { m, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { useRef, type ReactNode } from "react";

type HeroScrollStageProps = { text: ReactNode; visual: ReactNode; bell: ReactNode };

/**
 * Bố cục Hero 55/45 kèm chuyển động theo cuộn:
 * chữ trôi chậm, mockup trôi nhanh hơn (parallax), cả khối thu nhỏ 1 → 0,94 và mờ 1 → 0,3 khi cuộn qua.
 * Giá trị khởi đầu luôn là trạng thái tĩnh (opacity 1, không dịch), nên H1 hiện ngay từ HTML server.
 */
export function HeroScrollStage({ text, visual, bell }: HeroScrollStageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const still = useReducedMotion() === true;
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.4 });

  const textY = useTransform(progress, [0, 1], still ? [0, 0] : [0, -60]);
  const visualY = useTransform(progress, [0, 1], still ? [0, 0] : [0, -140]);
  const scale = useTransform(progress, [0, 1], still ? [1, 1] : [1, 0.94]);
  const opacity = useTransform(progress, [0, 1], still ? [1, 1] : [1, 0.3]);

  return (
    <m.div
      ref={ref}
      style={{ scale, opacity }}
      className="mx-auto grid max-w-7xl items-center gap-14 px-5 md:px-8 lg:grid-cols-[55fr_45fr] lg:gap-12"
    >
      <m.div style={{ y: textY }} className="max-w-2xl">
        {text}
      </m.div>
      <m.div style={{ y: visualY }} className="relative mx-auto w-full max-w-[460px] max-lg:mt-16 lg:max-w-none">
        {bell && (
          <div
            aria-hidden
            className="pointer-events-none absolute -right-[2%] -top-[12%] -z-10 aspect-[612/530] w-[46%] lg:-right-[24%] lg:-top-[8%] lg:w-[62%]"
          >
            {bell}
          </div>
        )}
        <div className="lg:mr-auto lg:w-[80%]">{visual}</div>
      </m.div>
    </m.div>
  );
}
