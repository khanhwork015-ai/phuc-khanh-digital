"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { BellScene } from "@/components/three/bell-scene";
import { assetPath } from "@/lib/asset-path";
import { canUse3D, needsWebGLProbe, readMotionEnv } from "@/lib/motion-env";
import { cn } from "@/lib/utils";

/** Sự kiện báo cho nền lưới chấm Hero biết chuông 3D đang chạy (để nền chỉ giữ khung tĩnh). */
export const BELL_3D_EVENT = "pkd:bell3d";
/** Tương tác đầu tiên của người dùng mới khởi động 3D (không chen vào lúc trang đang tải). */
const FIRST_INTERACTION_EVENTS = ["pointermove", "pointerdown", "wheel", "keydown", "touchstart", "scroll"] as const;

/**
 * Chuông PK ở Hero. Ảnh SVG tĩnh luôn có sẵn từ HTML; trên máy tính đủ điều kiện (canUse3D),
 * ở lần tương tác đầu tiên (rê chuột, cuộn, bấm phím) và khi trình duyệt rảnh, tải three.js và hiện chuông 3D chồng lên.
 * Mọi lỗi (tải chunk, fetch, WebGL, mất context) đều quay về ảnh tĩnh, không báo lỗi ra console.
 */
export function HeroBell() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const hero = canvas.closest("section");

    let scene: BellScene | null = null;
    let booting = false;
    let cancelled = false;
    let timer = 0;
    let idle = 0;
    let resizeTimer = 0;
    // Dò WebGL tốn kém: chỉ dò khi các điều kiện rẻ đã đạt, và chỉ dò một lần
    let webglKnown: boolean | null = null;
    const allowed3D = () => {
      const env = readMotionEnv();
      if (!needsWebGLProbe(env)) return false;
      webglKnown ??= readMotionEnv({ probeWebGL: true }).webgl;
      return canUse3D({ ...env, webgl: webglKnown });
    };

    const announce = (active: boolean) => window.dispatchEvent(new CustomEvent(BELL_3D_EVENT, { detail: active }));

    const teardown = () => {
      if (!scene) return;
      scene.dispose();
      scene = null;
      setReady(false);
      announce(false);
    };

    const syncScroll = () => {
      if (!scene || !hero) return;
      scene.setScroll(window.scrollY / Math.max(1, hero.offsetHeight));
    };

    const boot = async () => {
      if (booting || scene || !allowed3D()) return;
      booting = true;
      try {
        const [{ BellScene }, svgText] = await Promise.all([
          import("@/components/three/bell-scene"),
          fetch(assetPath("/brand/logo-mark.svg")).then((res) => {
            if (!res.ok) throw new Error(`logo ${res.status}`);
            return res.text();
          }),
        ]);
        if (cancelled || !allowed3D()) return;
        scene = new BellScene(canvas, svgText);
        scene.onContextLost = teardown;
        syncScroll();
        scene.start();
        setReady(true);
        announce(true);
      } catch {
        teardown();
      } finally {
        booting = false;
      }
    };

    const onFirstInteraction = () => {
      FIRST_INTERACTION_EVENTS.forEach((type) => window.removeEventListener(type, onFirstInteraction));
      if (typeof window.requestIdleCallback === "function") {
        idle = window.requestIdleCallback(() => void boot(), { timeout: 800 });
      } else {
        timer = window.setTimeout(() => void boot(), 100);
      }
    };
    const schedule = () => {
      // Máy không đủ điều kiện rẻ (điện thoại, màn nhỏ, giảm chuyển động) thì không cần nghe gì
      if (!needsWebGLProbe(readMotionEnv())) return;
      FIRST_INTERACTION_EVENTS.forEach((type) => window.addEventListener(type, onFirstInteraction, { passive: true }));
    };

    const onPointerMove = (e: PointerEvent) =>
      scene?.setPointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);

    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        const allowed = allowed3D();
        if (!allowed) teardown();
        else if (!scene) void boot();
      }, 250);
    };

    const io = new IntersectionObserver(([entry]) => {
      if (!scene) return;
      if (entry.isIntersecting && !document.hidden) scene.start();
      else scene.stop();
    });
    const onVisibility = () => {
      if (!scene) return;
      if (document.hidden) scene.stop();
      else scene.start();
    };

    io.observe(canvas);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("scroll", syncScroll, { passive: true });
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);
    schedule();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.clearTimeout(resizeTimer);
      if (idle && "cancelIdleCallback" in window) window.cancelIdleCallback(idle);
      io.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("scroll", syncScroll);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      FIRST_INTERACTION_EVENTS.forEach((type) => window.removeEventListener(type, onFirstInteraction));
      teardown();
    };
  }, []);

  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-[18%] rounded-full bg-accent/20 blur-3xl" />
      <Image
        src={assetPath("/brand/logo-mark.svg")}
        alt=""
        width={612}
        height={530}
        unoptimized
        className={cn("relative h-full w-full object-contain transition-opacity duration-700", ready && "opacity-0")}
      />
      <canvas
        ref={canvasRef}
        data-bell
        className={cn("absolute inset-0 h-full w-full opacity-0 transition-opacity duration-700", ready && "opacity-100")}
      />
    </div>
  );
}
