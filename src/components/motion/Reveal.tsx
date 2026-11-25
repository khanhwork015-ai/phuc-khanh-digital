"use client";

import { m, type HTMLMotionProps } from "motion/react";
import { motionTokens } from "@/lib/theme";

type RevealProps = HTMLMotionProps<"div"> & { delay?: number };

/** Trượt nhẹ y: 16 -> 0 và mờ dần vào khi phần tử xuất hiện trong khung nhìn. */
export function Reveal({ delay = 0, children, ...rest }: RevealProps) {
  const { y, duration, ease } = motionTokens.reveal;
  return (
    <m.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration, ease, delay }}
      {...rest}
    >
      {children}
    </m.div>
  );
}
