"use client";

import Lenis from "lenis";
import { LazyMotion, MotionConfig } from "motion/react";
import { createContext, useCallback, useContext, useEffect, useRef } from "react";
import { getLenisOptions, readMotionEnv, SMOOTH_SCROLL_TOUCH } from "@/lib/motion-env";

const NAV_OFFSET = -72;
const loadMotionFeatures = () => import("./motion-features").then((mod) => mod.default);

type ScrollTo = (target: string | number | HTMLElement) => void;

const SmoothScrollContext = createContext<ScrollTo>(() => {});

export function useSmoothScroll() {
  return useContext(SmoothScrollContext);
}

export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    // Máy tính: làm mượt con lăn/touchpad. Cảm ứng: syncTouch (tắt bằng SMOOTH_SCROLL_TOUCH). Giảm chuyển động: không bật.
    const options = getLenisOptions(readMotionEnv(), SMOOTH_SCROLL_TOUCH);
    if (!options) return;

    let lenis: Lenis | null = null;
    let frame = 0;
    const raf = (time: number) => {
      lenis?.raf(time);
      frame = requestAnimationFrame(raf);
    };

    // Khởi tạo khi trình duyệt rảnh để không chen vào lần vẽ đầu tiên
    const init = () => {
      lenis = new Lenis(options);
      lenisRef.current = lenis;
      frame = requestAnimationFrame(raf);
    };
    const idle = "requestIdleCallback" in window ? window.requestIdleCallback(init, { timeout: 1500 }) : 0;
    const timer = idle ? 0 : window.setTimeout(init, 300);

    return () => {
      if (idle) window.cancelIdleCallback(idle);
      window.clearTimeout(timer);
      cancelAnimationFrame(frame);
      lenis?.destroy();
      lenisRef.current = null;
    };
  }, []);

  const scrollTo = useCallback<ScrollTo>((target) => {
    if (lenisRef.current) {
      // Không truyền offset: Lenis tự trừ scroll-padding-top của <html>
      lenisRef.current.scrollTo(target);
      return;
    }
    const behavior: ScrollBehavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    const el =
      typeof target === "string" ? document.querySelector<HTMLElement>(target) : target;
    if (typeof el === "number") {
      window.scrollTo({ top: el, behavior });
    } else if (el) {
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + NAV_OFFSET, behavior });
    }
  }, []);

  return (
    <SmoothScrollContext.Provider value={scrollTo}>
      <LazyMotion features={loadMotionFeatures} strict>
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
      </LazyMotion>
    </SmoothScrollContext.Provider>
  );
}
