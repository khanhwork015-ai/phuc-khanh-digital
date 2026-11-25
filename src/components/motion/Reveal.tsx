"use client";

import { m, type HTMLMotionProps } from "motion/react";
import { motionTokens } from "@/lib/theme";

type RevealProps = HTMLMotionProps<"div"> & { delay?: number };

/** Trượt rõ rệt từ dưới lên (y: 56 -> 0, scale: 0.97 -> 1) khi phần tử tiến vào khung nhìn. */
export function Reveal({ delay = 0, children, ...rest }: RevealProps) {
  const { y, duration, ease } = motionTokens.reveal;
  return (
    <m.div
      initial={{ opacity: 0, y, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration, ease, delay }}
      {...rest}
    >
      {children}
    </m.div>
  );
}
