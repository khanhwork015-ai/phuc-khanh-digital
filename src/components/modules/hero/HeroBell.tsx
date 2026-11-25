"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { BellScene } from "@/components/three/bell-scene";
import { assetPath } from "@/lib/asset-path";
import { canUse3D, canUseLite3D, readMotionEnv } from "@/lib/motion-env";
import { cn } from "@/lib/utils";

/** Sự kiện báo cho nền lưới chấm Hero biết chuông 3D đang chạy (để nền nhường sân khấu). */
export const BELL_3D_EVENT = "pkd:bell3d";

function probeWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return Boolean(gl);
  } catch {
    return false;
  }
}

/**
 * Chuông PK 3D ở Hero (kèm vòng quỹ đạo & trường hạt 3D):
 * - Máy tính: chế độ đầy đủ (PMREM + 220 hạt + nghiêng theo chuột + zoom theo cuộn).
 * - Mobile/tablet: chế độ lite (80 hạt + DPR <= 1.25 + không lắng nghe chuột) để vẫn mượt 60fps.
 * - Reduce motion hoặc không có WebGL: giữ ảnh SVG tĩnh sạch sẽ.
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
    let webglKnown: boolean | null = null;

    const getMode = (): "full" | "lite" | "off" => {
      const env = readMotionEnv();
      if (env.reducedMotion) return "off";
      webglKnown ??= probeWebGL();
      const fullEnv = { ...env, webgl: webglKnown };
      if (canUse3D(fullEnv)) return "full";
      if (canUseLite3D(fullEnv)) return "lite";
      return "off";
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
      const rect = hero.getBoundingClientRect();
      const maxScroll = Math.max(1, hero.offsetHeight - window.innerHeight * 0.4);
      const scrolled = Math.max(0, -rect.top);
      scene.setScroll(scrolled / maxScroll);
    };

    const boot = async () => {
      const mode = getMode();
      if (booting || scene || mode === "off") return;
      booting = true;
      try {
        const [{ BellScene }, svgText] = await Promise.all([
          import("@/components/three/bell-scene"),
          fetch(assetPath("/brand/logo-mark.svg")).then((res) => {
            if (!res.ok) throw new Error(`logo ${res.status}`);
            return res.text();
          }),
        ]);
        if (cancelled || getMode() === "off") return;
        scene = new BellScene(canvas, svgText, { lite: mode === "lite" });
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

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      scene?.setPointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
    };

    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        if (getMode() === "off") teardown();
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

    // Khởi động ngay sau khi trình duyệt vẽ xong khung đầu tiên
    if (typeof window.requestIdleCallback === "function") {
      idle = window.requestIdleCallback(() => void boot(), { timeout: 250 });
    } else {
      timer = window.setTimeout(() => void boot(), 50);
    }

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
      teardown();
    };
  }, []);

  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-[15%] rounded-full bg-accent/20 blur-3xl" />
      <Image
        src={assetPath("/brand/logo-mark.svg")}
        alt=""
        width={612}
        height={530}
        unoptimized
        className={cn(
          "relative h-full w-full object-contain opacity-45 transition-opacity duration-700 lg:opacity-60",
          ready && "opacity-0 lg:opacity-0",
        )}
      />
      <canvas
        ref={canvasRef}
        data-bell
        className={cn("absolute inset-0 h-full w-full opacity-0 transition-opacity duration-700", ready && "opacity-100")}
      />
    </div>
  );
}
