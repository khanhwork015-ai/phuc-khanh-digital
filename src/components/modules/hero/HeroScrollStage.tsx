"use client";

import { ArrowDown } from "lucide-react";
import { m, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { useRef, type ReactNode } from "react";
import { useHeavyMotion } from "@/components/motion/useHeavyMotion";

type HeroScrollStageProps = { text: ReactNode; visual: ReactNode; bell: ReactNode };

/**
 * Sân khấu Hero kiểu studio (chuông 3D hoàn toàn lộ thiên, không bị che):
 * - Desktop (>= 1024px): ghim 100vh trong vùng cuộn 210vh:
 *   + Nhịp 1 (0 -> 0.35): Quả chuông PK 3D + vòng quỹ đạo + hạt vàng chiếm trọn sân khấu phải, không bị thẻ nào che.
 *   + Nhịp 2 (0.35 -> 0.85): Chuông 3D lùi sâu/mờ dần, nhường chỗ cho mockup bài đăng phóng to (zoom-in) vào tâm.
 * - Mobile (< 1024px): chuông 3D đặt thành một khối riêng lộ thiên phía trên mockup, không chồng chéo.
 */
export function HeroScrollStage({ text, visual, bell }: HeroScrollStageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const still = useReducedMotion() === true;
  const heavy = useHeavyMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const progress = useSpring(scrollYProgress, { stiffness: 110, damping: 26, mass: 0.45 });

  // Cột chữ bên trái: giữ rõ ở nhịp 1 & 2, trượt nhẹ và mờ dần khi rời Hero
  const textY = useTransform(progress, [0, 1], still ? [0, 0] : heavy ? [0, -70] : [0, -24]);
  const textOpacity = useTransform(progress, [0, 0.72, 1], still ? [1, 1, 1] : [1, 1, 0.15]);

  // Desktop Nhịp 1: Chuông 3D lộ thiên hoàn toàn -> lùi sâu khi mockup tiến vào
  const bellOpacity = useTransform(progress, [0, 0.28, 0.55], still || !heavy ? [1, 1, 1] : [1, 1, 0.12]);
  const bellScale = useTransform(progress, [0, 0.3, 0.65], still || !heavy ? [1, 1, 1] : [1, 1.08, 0.84]);

  // Desktop Nhịp 2: Mockup bài đăng ẩn gọn ở nhịp 1 để không che chuông, phóng to mượt khi cuộn
  const mockupOpacity = useTransform(progress, [0, 0.24, 0.46, 0.86, 1], still || !heavy ? [1, 1, 1, 1, 1] : [0, 0, 1, 1, 0.2]);
  const mockupScale = useTransform(progress, [0.24, 0.5, 1], still || !heavy ? [1, 1, 1] : [0.86, 1, 0.9]);
  const mockupY = useTransform(progress, [0.24, 0.5, 1], still || !heavy ? [0, 0, 0] : [48, 0, -90]);

  const cueOpacity = useTransform(progress, [0, 0.12], still ? [0, 0] : [1, 0]);

  return (
    <div ref={ref} className="relative lg:h-[210vh]">
      <div className="relative flex min-h-[calc(100svh-4rem)] flex-col justify-center overflow-hidden py-16 pt-24 lg:sticky lg:top-0 lg:h-screen lg:py-0 lg:pt-16">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-12 px-5 md:px-8 lg:grid-cols-[52fr_48fr] lg:gap-10">
          <m.div style={{ y: textY, opacity: textOpacity }} className="relative z-10 max-w-2xl">
            {text}
          </m.div>

          {/* Cột phải: Desktop xếp chồng 2 nhịp (Chuông 3D lộ thiên -> Mockup); Mobile xếp dọc không che nhau */}
          <div className="relative mx-auto flex w-full max-w-[460px] flex-col items-center gap-10 lg:block lg:h-[540px] lg:max-w-none">
            <m.div
              aria-hidden
              style={{ opacity: bellOpacity, scale: bellScale }}
              className="relative aspect-[612/530] w-[78vw] max-w-[340px] sm:w-[380px] lg:absolute lg:inset-0 lg:m-auto lg:w-full lg:max-w-[540px]"
            >
              {bell}
            </m.div>

            <m.div
              style={
                heavy
                  ? { opacity: mockupOpacity, scale: mockupScale, y: mockupY }
                  : undefined
              }
              className="relative z-10 w-full lg:absolute lg:inset-0 lg:m-auto lg:flex lg:max-w-[460px] lg:items-center"
            >
              {visual}
            </m.div>
          </div>
        </div>

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
