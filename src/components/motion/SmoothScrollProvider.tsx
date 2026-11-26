"use client";

import Lenis from "lenis";
import { LazyMotion, MotionConfig } from "motion/react";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname() ?? "/";
  // Smooth scrolling is a landing-page effect; inside the app (dashboard, portal, login)
  // it swallows wheel events of popups and scrollable panels.
  const appArea = /^\/(dashboard|portal|login)(\/|$)/.test(pathname);

  useEffect(() => {
    if (appArea) return;
    const options = getLenisOptions(readMotionEnv(), SMOOTH_SCROLL_TOUCH);
    if (!options) return;

    const lenis = new Lenis({
      ...options,
      wheelMultiplier: 0.95,
    });
    lenisRef.current = lenis;

    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [appArea]);

  const scrollTo = useCallback<ScrollTo>((target) => {
    if (lenisRef.current) {
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
