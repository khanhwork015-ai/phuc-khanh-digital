"use client";

import { m } from "motion/react";
import { easeOutExpo } from "@/lib/theme";

/** Gạch ngang nhỏ cạnh nhãn section, dài ra từ trái sang khi xuất hiện (một lần). */
export function GrowLine() {
  return (
    <m.span
      aria-hidden
      initial={{ scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.7, ease: easeOutExpo, delay: 0.15 }}
      className="h-px w-6 origin-left bg-line-strong"
    />
  );
}
