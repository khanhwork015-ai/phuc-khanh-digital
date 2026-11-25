"use client";

import { useEffect, useRef } from "react";
import { BELL_3D_EVENT } from "@/components/modules/hero/HeroBell";
import { cn } from "@/lib/utils";

const SPACING = 28;
const ACCENT = { r: 233, g: 190, b: 87 };
const FRAME_MS = 1000 / 30; // Nền chuyển động chậm, 30fps là đủ mượt và nhẹ CPU
const START_DELAY_MS = 1200; // Nhường luồng chính cho lần tải trang đầu

/**
 * Nền ánh sáng Hero: lưới chấm mảnh được chiếu sáng bởi một nguồn sáng vàng kim
 * trôi chậm và một nguồn nhỏ đi theo con trỏ.
 * - Chỉ vẽ 1 khung tĩnh khi bật Reduce Motion, thiết bị yếu hoặc màn hình cảm ứng/nhỏ.
 * - Bắt đầu chạy sau khi trang tải xong và trình duyệt rảnh.
 * - Tự dừng khi Hero ra khỏi màn hình hoặc tab bị ẩn.
 */
export function AmbientShaderCanvas({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const wide = window.matchMedia("(min-width: 1024px)").matches;
    const cores = navigator.hardwareConcurrency ?? 8;
    const isStatic = reduce || !finePointer || !wide || cores <= 2;

    let width = 0;
    let height = 0;
    let frame = 0;
    let lastDraw = 0;
    let visible = true;
    // Khi chuông 3D chạy thì giữ khung hiện tại, không vẽ lại (tránh hai vòng lặp vẽ cùng lúc)
    let pausedFor3D = false;
    const onBell3D = (e: Event) => {
      pausedFor3D = (e as CustomEvent<boolean>).detail === true;
    };
    window.addEventListener(BELL_3D_EVENT, onBell3D);
    let startTimer = 0;
    let idleHandle = 0;
    const pointer = { x: -9999, y: -9999, tx: -9999, ty: -9999, active: false };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, width, height);

      const time = t * 0.00012;
      const lx = width * (0.68 + Math.cos(time) * 0.1);
      const ly = height * (0.38 + Math.sin(time * 1.3) * 0.12);
      const lr = Math.max(width, height) * 0.55;

      const glow = ctx.createRadialGradient(lx, ly, 0, lx, ly, lr);
      glow.addColorStop(0, `rgba(${ACCENT.r},${ACCENT.g},${ACCENT.b},0.10)`);
      glow.addColorStop(0.45, `rgba(${ACCENT.r},${ACCENT.g},${ACCENT.b},0.03)`);
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      pointer.x += (pointer.tx - pointer.x) * 0.15;
      pointer.y += (pointer.ty - pointer.y) * 0.15;
      const pr = 180;

      const offsetX = (width % SPACING) / 2;
      const offsetY = (height % SPACING) / 2;
      for (let x = offsetX; x < width; x += SPACING) {
        for (let y = offsetY; y < height; y += SPACING) {
          const d1 = Math.hypot(x - lx, y - ly) / lr;
          let a = 0.05 + Math.max(0, 1 - d1) * 0.22;
          let gold = Math.max(0, 1 - d1 * 1.4);
          if (pointer.active) {
            const d2 = Math.hypot(x - pointer.x, y - pointer.y) / pr;
            if (d2 < 1) {
              const k = (1 - d2) ** 2;
              a += k * 0.35;
              gold = Math.max(gold, k);
            }
          }
          // Lượng tử hóa để trình duyệt tái sử dụng chuỗi màu, giảm chi phí parse
          const g = Math.round(gold * 8) / 8;
          ctx.globalAlpha = Math.min(1, a);
          ctx.fillStyle = `rgb(${Math.round(255 + (ACCENT.r - 255) * g)},${Math.round(255 + (ACCENT.g - 255) * g)},${Math.round(255 + (ACCENT.b - 255) * g)})`;
          ctx.fillRect(x - 0.6, y - 0.6, 1.2, 1.2);
        }
      }
      ctx.globalAlpha = 1;
    };

    const loop = (t: number) => {
      frame = requestAnimationFrame(loop);
      if (!visible || pausedFor3D || document.hidden || t - lastDraw < FRAME_MS) return;
      lastDraw = t;
      draw(t);
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const inside =
        e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
      pointer.tx = e.clientX - rect.left;
      pointer.ty = e.clientY - rect.top;
      if (inside && !pointer.active) {
        pointer.x = pointer.tx;
        pointer.y = pointer.ty;
      }
      pointer.active = inside && e.pointerType === "mouse";
    };

    const onResize = () => {
      resize();
      if (isStatic) draw(0);
    };

    resize();
    draw(0);
    window.addEventListener("resize", onResize);

    if (isStatic) {
      return () => {
        window.removeEventListener("resize", onResize);
        window.removeEventListener(BELL_3D_EVENT, onBell3D);
      };
    }

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });

    const start = () => {
      io.observe(canvas);
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      frame = requestAnimationFrame(loop);
    };

    startTimer = window.setTimeout(() => {
      if ("requestIdleCallback" in window) {
        idleHandle = window.requestIdleCallback(start, { timeout: 1500 });
      } else {
        start();
      }
    }, START_DELAY_MS);

    return () => {
      window.clearTimeout(startTimer);
      if (idleHandle && "cancelIdleCallback" in window) window.cancelIdleCallback(idleHandle);
      cancelAnimationFrame(frame);
      io.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener(BELL_3D_EVENT, onBell3D);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
    />
  );
}
