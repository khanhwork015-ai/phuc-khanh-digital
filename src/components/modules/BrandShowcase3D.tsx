"use client";

import { ArrowUpRight } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { showcaseBrandsData, type ShowcaseBrand } from "@/data/brand-showcase-3d";
import { cn } from "@/lib/utils";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

type Phase = "SPINNING" | "PINNING" | "SHOWCASE" | "UNPINNING" | "DRAGGING" | "COASTING";

type ResponsiveConfig = {
  radiusX: number;
  radiusZ: number;
  baseSize: number;
  pinScale: number;
  extrudeLayers: number;
  pinZ: number;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  decay: number;
  color: string;
  twinklePhase: number;
};

const TWO_PI = Math.PI * 2;
const SHOWCASE_MS = 5000;
const PIN_MS = 600;
const UNPIN_MS = 500;
const SPIN_MS = 1350;
const QUICK_SPIN_MS = 700;

function getResponsiveConfig(width: number): ResponsiveConfig {
  if (width >= 1024) {
    return { radiusX: 420, radiusZ: 220, baseSize: 220, pinScale: 1, extrudeLayers: 12, pinZ: 0 };
  }
  if (width >= 768) {
    return { radiusX: 280, radiusZ: 150, baseSize: 176, pinScale: 1, extrudeLayers: 8, pinZ: 0 };
  }
  return { radiusX: 150, radiusZ: 90, baseSize: 140, pinScale: 1, extrudeLayers: 6, pinZ: 0 };
}

function createShuffledQueue(total: number, avoidFirst: number): number[] {
  const arr = Array.from({ length: total }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  if (total > 1 && arr[0] === avoidFirst) {
    const swapIdx = 1 + Math.floor(Math.random() * (total - 1));
    [arr[0], arr[swapIdx]] = [arr[swapIdx], arr[0]];
  }
  return arr;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function BrandShowcase3D() {
  const brands = showcaseBrandsData;
  const total = brands.length;
  const reduce = useReducedMotion() === true;

  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const sheenRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const dragRef = useRef({
    active: false,
    startX: 0,
    startOrbit: 0,
    lastX: 0,
    lastTime: 0,
    velocity: 0,
    moved: false,
    suppressClick: false,
  });

  const [config, setConfig] = useState<ResponsiveConfig>(() => getResponsiveConfig(1280));
  const [inView, setInView] = useState(false);
  const [pinnedIndex, setPinnedIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("SPINNING");

  // Mutable animation state (no React re-renders per frame)
  const animRef = useRef({
    phase: "SPINNING" as Phase,
    phaseStart: 0,
    lastFrameTime: 0,
    spinDuration: SPIN_MS,
    spinEaseOutOnly: false,
    orbitAngle: 0,
    startOrbit: 0,
    targetOrbit: 0,
    coastVelocity: 0,
    targetIdx: 0,
    lastPinnedIdx: -1,
    queue: createShuffledQueue(total, -1),
    mouseX: 0,
    mouseY: 0,
    rotX: 0,
    rotY: 0,
    hasPointer: false,
    particles: [] as Particle[],
    burstFired: false,
  });

  const logoUrls = useMemo(
    () => brands.map((b) => `${basePath}${b.logoUrl}`),
    [brands],
  );

  // Responsive listener
  useEffect(() => {
    const update = () => setConfig(getResponsiveConfig(window.innerWidth));
    update();
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, []);

  // Viewport culling
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.08 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const burstFirework = useCallback((accentColor: string) => {
    const count = 40;
    const next: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (TWO_PI * i) / count + (Math.random() - 0.5) * 0.35;
      const speed = 2.4 + Math.random() * 4.8;
      next.push({
        x: 300,
        y: 300,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.8,
        size: 1.8 + Math.random() * 2.8,
        alpha: 1,
        decay: 0.011 + Math.random() * 0.012,
        color: i % 3 === 0 ? "#FFFBEB" : i % 2 === 0 ? accentColor : "#E9BE57",
        twinklePhase: Math.random() * TWO_PI,
      });
    }
    animRef.current.particles = next;
  }, []);

  const scheduleSpinTo = useCallback(
    (explicitIdx?: number, fast = false, easeOutOnly = false) => {
      const st = animRef.current;
      let nextIdx: number;
      if (typeof explicitIdx === "number") {
        nextIdx = explicitIdx;
        st.queue = st.queue.filter((q) => q !== explicitIdx);
      } else {
        if (st.queue.length === 0) {
          st.queue = createShuffledQueue(total, st.lastPinnedIdx);
        }
        nextIdx = st.queue.shift() ?? 0;
      }

      const baseSlot = (nextIdx / total) * TWO_PI;
      // Want (baseSlot + targetOrbit) % 2π === 0
      const currentMod = ((st.orbitAngle % TWO_PI) + TWO_PI) % TWO_PI;
      const desiredMod = (((-baseSlot) % TWO_PI) + TWO_PI) % TWO_PI;
      let delta: number;
      if (fast) {
        // Shortest angular path in [-π, π] so dragging/clicking snaps smoothly without a full 360° spin
        delta = Math.atan2(Math.sin(desiredMod - currentMod), Math.cos(desiredMod - currentMod));
      } else {
        delta = desiredMod - currentMod;
        if (delta <= 0.15) delta += TWO_PI;
        delta += TWO_PI; // At least 1 full extra spin for auto-loop
      }

      st.targetIdx = nextIdx;
      st.startOrbit = st.orbitAngle;
      st.targetOrbit = st.orbitAngle + delta;
      st.spinDuration = fast ? (easeOutOnly ? 460 : QUICK_SPIN_MS) : SPIN_MS;
      st.spinEaseOutOnly = easeOutOnly;
      st.phase = "SPINNING";
      st.phaseStart = performance.now();
      st.burstFired = false;
      setPinnedIndex(nextIdx);
      setPhase("SPINNING");
    },
    [total],
  );

  // Initialize first target on mount
  useEffect(() => {
    scheduleSpinTo(undefined, false);
  }, [scheduleSpinTo]);

  // Main 60fps animation loop (GPU transforms + 2D particle canvas)
  useEffect(() => {
    if (!inView || reduce) return;

    let rafId = 0;
    const startLoop = (now: number) => {
      const st = animRef.current;
      if (st.phaseStart === 0) st.phaseStart = now;
      const dtSec = st.lastFrameTime ? Math.min(0.05, (now - st.lastFrameTime) / 1000) : 0.016;
      st.lastFrameTime = now;
      const elapsed = now - st.phaseStart;

      let pinFactor = 0; // 0 = on orbit, 1 = pinned center
      let dimFactor = 0; // 0 = normal, 1 = others dimmed back

      if (st.phase === "DRAGGING") {
        st.rotX = lerp(st.rotX, 0, 0.2);
        st.rotY = lerp(st.rotY, 0, 0.2);
      } else if (st.phase === "COASTING") {
        st.orbitAngle += st.coastVelocity * dtSec;
        st.coastVelocity *= Math.pow(0.08, dtSec);
        st.rotX = lerp(st.rotX, 0, 0.15);
        st.rotY = lerp(st.rotY, 0, 0.15);
        if (Math.abs(st.coastVelocity) < 0.75) {
          let bestIdx = 0;
          let bestDist = Infinity;
          for (let i = 0; i < total; i++) {
            const slot = (i / total) * TWO_PI + st.orbitAngle;
            const wrapped = Math.atan2(Math.sin(slot), Math.cos(slot));
            const dist = Math.abs(wrapped);
            if (dist < bestDist) {
              bestDist = dist;
              bestIdx = i;
            }
          }
          scheduleSpinTo(bestIdx, true, true);
        }
      } else if (st.phase === "SPINNING") {
        const t = Math.min(1, elapsed / st.spinDuration);
        const eased = st.spinEaseOutOnly ? easeOutQuart(t) : easeInOutCubic(t);
        st.orbitAngle = lerp(st.startOrbit, st.targetOrbit, eased);
        st.rotX = lerp(st.rotX, 0, 0.12);
        st.rotY = lerp(st.rotY, 0, 0.12);
        if (t >= 1) {
          st.orbitAngle = st.targetOrbit;
          st.phase = "PINNING";
          st.phaseStart = now;
          setPhase("PINNING");
        }
      } else if (st.phase === "PINNING") {
        const t = Math.min(1, elapsed / PIN_MS);
        const e = easeOutQuart(t);
        pinFactor = e;
        dimFactor = e;
        if (t >= 1) {
          st.phase = "SHOWCASE";
          st.phaseStart = now;
          st.lastPinnedIdx = st.targetIdx;
          setPhase("SHOWCASE");
          if (!st.burstFired) {
            st.burstFired = true;
            burstFirework(brands[st.targetIdx]?.accentColor ?? "#E9BE57");
          }
        }
      } else if (st.phase === "SHOWCASE") {
        pinFactor = 1;
        dimFactor = 1;
        const sec = elapsed / 1000;
        const targetRotX = st.hasPointer ? -st.mouseY * 15 : Math.sin(sec * 1.1) * 5;
        const targetRotY = st.hasPointer ? st.mouseX * 22 : Math.sin(sec * 1.35) * 14;
        st.rotX = lerp(st.rotX, targetRotX, 0.08);
        st.rotY = lerp(st.rotY, targetRotY, 0.08);

        if (elapsed >= SHOWCASE_MS) {
          st.phase = "UNPINNING";
          st.phaseStart = now;
          setPhase("UNPINNING");
        }
      } else if (st.phase === "UNPINNING") {
        const t = Math.min(1, elapsed / UNPIN_MS);
        const e = 1 - easeInOutCubic(t);
        pinFactor = e;
        dimFactor = e;
        st.rotX = lerp(st.rotX, 0, 0.15);
        st.rotY = lerp(st.rotY, 0, 0.15);
        if (t >= 1) {
          scheduleSpinTo(undefined, false);
        }
      }

      // Position every 3D logo item via direct DOM transforms
      const secShowcase = st.phase === "SHOWCASE" ? elapsed / 1000 : 0;
      const bellSwingZ =
        st.phase === "SHOWCASE" ? Math.sin(secShowcase * 2.5) * 4 * Math.exp(-secShowcase * 0.4) : 0;

      for (let i = 0; i < total; i++) {
        const el = itemRefs.current[i];
        if (!el) continue;

        const theta = (i / total) * TWO_PI + st.orbitAngle;
        const orbitX = Math.sin(theta) * config.radiusX;
        const orbitZ = Math.cos(theta) * config.radiusZ - config.radiusZ * 0.65;
        const orbitY = -Math.cos(theta) * 16;

        // Depth factor from orbitZ
        const depthNorm = (Math.cos(theta) + 1) / 2;
        const orbitScale = 0.44 + depthNorm * 0.28;
        const orbitOpacity = 0.34 + depthNorm * 0.66;

        const isTarget = i === st.targetIdx;

        if (isTarget && pinFactor > 0) {
          const x = lerp(orbitX, 0, pinFactor);
          const y = lerp(orbitY, -14, pinFactor);
          const z = lerp(orbitZ, config.pinZ, pinFactor);
          const scale = lerp(orbitScale, config.pinScale, pinFactor);
          const rx = st.rotX * pinFactor;
          const ry = st.rotY * pinFactor;
          const rz = bellSwingZ * pinFactor;

          el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
          el.style.opacity = "1";
          el.style.zIndex = "40";

          const sheenEl = sheenRefs.current[i];
          if (sheenEl) {
            const shift = (ry / 18) * 35;
            sheenEl.style.transform = `translate3d(${shift.toFixed(1)}%, 0, 0)`;
            sheenEl.style.opacity = st.phase === "SHOWCASE" ? "0.7" : "0.25";
          }
        } else {
          const z = orbitZ - dimFactor * 80;
          const op = lerp(orbitOpacity, orbitOpacity * 0.32, dimFactor);
          // Subtle counter-rotation so cards face viewer cleanly
          const facingY = (-Math.sin(theta) * 14).toFixed(2);
          el.style.transform = `translate3d(${orbitX.toFixed(1)}px, ${orbitY.toFixed(1)}px, ${z.toFixed(1)}px) rotateY(${facingY}deg) scale(${orbitScale.toFixed(3)})`;
          el.style.opacity = op.toFixed(3);
          el.style.zIndex = String(Math.round(depthNorm * 25) + 1);

          const sheenEl = sheenRefs.current[i];
          if (sheenEl) {
            sheenEl.style.opacity = "0";
          }
        }
      }

      // Render lightweight 2D particle sparkles on canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, 600, 600);
          const list = st.particles;
          for (let i = list.length - 1; i >= 0; i--) {
            const p = list[i];
            p.vx *= 0.965;
            p.vy = p.vy * 0.965 + 0.045;
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= p.decay;
            p.twinklePhase += 0.28;
            if (p.alpha <= 0) {
              list.splice(i, 1);
              continue;
            }
            const twinkle = 0.65 + 0.35 * Math.sin(p.twinklePhase);
            ctx.globalAlpha = Math.max(0, p.alpha * twinkle);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, TWO_PI);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        }
      }

      rafId = requestAnimationFrame(startLoop);
    };

    rafId = requestAnimationFrame(startLoop);
    return () => cancelAnimationFrame(rafId);
  }, [inView, reduce, config, total, brands, burstFirework, scheduleSpinTo]);

  function handleMouseMove(e: React.MouseEvent<HTMLElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    animRef.current.mouseX = Math.max(-1, Math.min(1, nx));
    animRef.current.mouseY = Math.max(-1, Math.min(1, ny));
    animRef.current.hasPointer = true;
  }

  function handleMouseLeave() {
    animRef.current.hasPointer = false;
  }

  const finishDrag = useCallback(() => {
    const d = dragRef.current;
    if (!d.active) return;
    d.active = false;
    if (!d.moved) return;

    d.suppressClick = true;
    window.setTimeout(() => {
      dragRef.current.suppressClick = false;
    }, 80);

    // If velocity is strong, coast smoothly across multiple rotations before snapping
    if (Math.abs(d.velocity) > 1.6) {
      animRef.current.coastVelocity = Math.max(-18, Math.min(18, d.velocity * 1.15));
      animRef.current.phase = "COASTING";
      animRef.current.phaseStart = performance.now();
      setPhase("COASTING");
      return;
    }

    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < total; i++) {
      const slot = (i / total) * TWO_PI + animRef.current.orbitAngle;
      const wrapped = Math.atan2(Math.sin(slot), Math.cos(slot));
      const dist = Math.abs(wrapped);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    scheduleSpinTo(bestIdx, true, true);
  }, [total, scheduleSpinTo]);

  useEffect(() => {
    const onWinMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d.active || reduce) return;
      const dx = e.clientX - d.startX;
      if (!d.moved && Math.abs(dx) > 6) {
        d.moved = true;
        animRef.current.phase = "DRAGGING";
        setPhase("DRAGGING");
      }
      if (!d.moved) return;

      const now = performance.now();
      const dt = Math.max(8, now - d.lastTime);
      const stepRad = (e.clientX - d.lastX) / Math.max(120, config.radiusX * 0.72);
      const instVel = stepRad / (dt / 1000);
      d.velocity = lerp(d.velocity, instVel, 0.4);
      d.lastX = e.clientX;
      d.lastTime = now;

      animRef.current.orbitAngle = d.startOrbit + dx / Math.max(120, config.radiusX * 0.72);
    };

    const onWinUp = () => finishDrag();
    window.addEventListener("pointermove", onWinMove, { passive: true });
    window.addEventListener("pointerup", onWinUp, { passive: true });
    window.addEventListener("pointercancel", onWinUp, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onWinMove);
      window.removeEventListener("pointerup", onWinUp);
      window.removeEventListener("pointercancel", onWinUp);
    };
  }, [reduce, config.radiusX, finishDrag]);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (reduce || e.button > 0) return;
    const now = performance.now();
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startOrbit: animRef.current.orbitAngle,
      lastX: e.clientX,
      lastTime: now,
      velocity: 0,
      moved: false,
      suppressClick: false,
    };
  }

  const activeBrand: ShowcaseBrand = brands[pinnedIndex] ?? brands[0];
  const showShowcaseOverlay = !reduce && phase === "SHOWCASE";
  const layerIndices = useMemo(
    () => Array.from({ length: config.extrudeLayers }, (_, idx) => idx + 1),
    [config.extrudeLayers],
  );

  return (
    <section
      ref={sectionRef}
      aria-label="Thương hiệu đồng hành"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative overflow-hidden border-b border-line py-16 md:py-24"
    >
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-accent">
            Khách hàng & Đối tác
          </p>
          <h2 className="mt-3 text-balance text-2xl font-bold tracking-[-0.02em] text-fg md:text-3xl">
            Các thương hiệu tin tưởng giao trọn vận hành Fanpage
          </h2>
          <p className="mt-2.5 text-sm text-fg-2">
            Nắm kéo vòng xoay hoặc bấm trực tiếp vào bất kỳ logo nào để xem chi tiết.
          </p>
        </div>

        {reduce ? (
          /* Reduced-motion fallback: nhẹ nhàng, không xoay hay pháo hoa */
          <div className="mt-10 flex flex-col items-center gap-6">
            <div className="flex flex-wrap items-center justify-center gap-4">
              {brands.map((brand, idx) => (
                <button
                  key={brand.id}
                  type="button"
                  onClick={() => setPinnedIndex(idx)}
                  aria-label={`Xem thương hiệu ${brand.name}`}
                  className={cn(
                    "flex size-20 items-center justify-center rounded-2xl border p-2 transition-opacity",
                    idx === pinnedIndex ? "border-accent bg-surface opacity-100" : "border-line bg-surface/60 opacity-65 hover:opacity-100",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoUrls[idx]} alt={brand.name} className="size-full rounded-xl object-contain" />
                </button>
              ))}
            </div>
            <div className="flex flex-col items-center gap-3 text-center">
              <div>
                <p className="text-lg font-bold text-fg">{activeBrand.name}</p>
                <p className="font-mono text-xs text-fg-3">{activeBrand.category}</p>
              </div>
              <a
                href={activeBrand.fanpageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex min-h-[44px] items-center gap-2 rounded-full border border-line-accent bg-accent-muted px-4 py-2 text-xs font-semibold text-accent transition-all duration-200 hover:-translate-y-0.5 hover:border-accent hover:bg-accent hover:text-canvas hover:shadow-lg hover:shadow-accent/20"
              >
                <span>Đi đến Fanpage của {activeBrand.name}</span>
                <ArrowUpRight
                  size={15}
                  strokeWidth={2}
                  aria-hidden
                  className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </a>
            </div>
          </div>
        ) : (
          <div
            className="relative mt-6 flex flex-col items-center select-none touch-pan-y cursor-grab active:cursor-grabbing"
            onPointerDown={handlePointerDown}
          >
            {/* Lớp hào quang & pháo hoa nằm hoàn toàn phía sau sân khấu 3D (z-0) */}
            <div className="pointer-events-none relative flex h-[310px] w-full items-center justify-center sm:h-[360px] lg:h-[420px]">
              {/* Conic Sunburst Rays */}
              <div
                aria-hidden
                style={{
                  background: `repeating-conic-gradient(from 0deg, ${activeBrand.accentColor}44 0deg 8deg, transparent 8deg 24deg)`,
                }}
                className={cn(
                  "pk-brand3d-rays pointer-events-none absolute left-1/2 top-1/2 z-0 size-[340px] -translate-x-1/2 -translate-y-1/2 rounded-full transition-transform duration-700 sm:size-[440px] lg:size-[520px]",
                  showShowcaseOverlay ? "scale-100 opacity-100" : "scale-0 opacity-0",
                )}
              />

              {/* Canvas Sparkles */}
              <canvas
                ref={canvasRef}
                width={600}
                height={600}
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-1/2 z-0 size-[340px] -translate-x-1/2 -translate-y-1/2 sm:size-[440px] lg:size-[520px]"
              />

              {/* Sân khấu quỹ đạo 3D nằm phía trên hào quang (z-10) */}
              <div className="pk-brand3d-stage pointer-events-auto relative z-10 flex size-full items-center justify-center">

              {/* 8 vật thể logo 3D */}
              {brands.map((brand, idx) => (
                <button
                  key={brand.id}
                  ref={(el) => {
                    itemRefs.current[idx] = el;
                  }}
                  type="button"
                  onClick={() => {
                    if (dragRef.current.suppressClick) return;
                    if (idx !== pinnedIndex || phase !== "SHOWCASE") {
                      scheduleSpinTo(idx, true);
                    }
                  }}
                  aria-label={`Chọn thương hiệu ${brand.name}`}
                  style={{
                    width: config.baseSize,
                    height: config.baseSize,
                    left: "50%",
                    top: "50%",
                    marginLeft: -config.baseSize / 2,
                    marginTop: -config.baseSize / 2,
                  }}
                  className="pk-brand3d-bell absolute cursor-pointer focus-visible:outline-accent"
                >
                  {/* Extrusion Body Layers: thân khối huy hiệu 3D đồng nhất */}
                  {layerIndices.map((layer) => (
                    <span
                      key={layer}
                      aria-hidden
                      style={{
                        transform: `translate3d(0, 0, ${-(layer * 2)}px)`,
                      }}
                      className="pointer-events-none absolute inset-0 block rounded-2xl border border-amber-900/40 bg-gradient-to-br from-[#d9b45a] via-[#8c6216] to-[#452e06]"
                    />
                  ))}

                  {/* Layer 0: Mặt trước khung trắng đồng nhất + Specular Sheen */}
                  <span className="pk-brand3d-face relative flex size-full items-center justify-center overflow-hidden rounded-2xl border border-amber-500/40 bg-white p-2.5 shadow-[0_18px_35px_rgba(0,0,0,0.45)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={logoUrls[idx]}
                      alt={brand.name}
                      crossOrigin="anonymous"
                      className="size-full object-contain"
                    />
                    <span
                      ref={(el) => {
                        sheenRefs.current[idx] = el;
                      }}
                      aria-hidden
                      className="pk-brand3d-sheen pointer-events-none absolute inset-0 opacity-0"
                    />
                  </span>
                </button>
              ))}
              </div>
            </div>

            {/* Thông tin thương hiệu đang được Pin */}
            <div
              className={cn(
                "mt-2 flex min-h-[104px] flex-col items-center gap-3 text-center transition-all duration-500",
                showShowcaseOverlay ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0",
              )}
            >
              <div>
                <p className="text-lg font-bold tracking-tight text-fg sm:text-xl">{activeBrand.name}</p>
                <p className="mt-0.5 font-mono text-xs text-fg-3">{activeBrand.category}</p>
              </div>
              <a
                href={activeBrand.fanpageUrl}
                target="_blank"
                rel="noopener noreferrer"
                onPointerDown={(e) => e.stopPropagation()}
                tabIndex={showShowcaseOverlay ? 0 : -1}
                className="group inline-flex min-h-[44px] items-center gap-2 rounded-full border border-line-accent bg-accent-muted px-5 py-2 text-xs font-semibold text-accent transition-all duration-200 hover:-translate-y-0.5 hover:border-accent hover:bg-accent hover:text-canvas hover:shadow-lg hover:shadow-accent/20 active:scale-[0.98] sm:text-[13px]"
              >
                <span>Đi đến Fanpage của {activeBrand.name}</span>
                <ArrowUpRight
                  size={15}
                  strokeWidth={2}
                  aria-hidden
                  className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </a>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
