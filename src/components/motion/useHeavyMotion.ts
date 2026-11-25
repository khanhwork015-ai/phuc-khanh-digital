"use client";

import { useEffect, useState } from "react";
import { allowsHeavyMotion } from "@/lib/motion-env";

/**
 * true khi được phép chạy hiệu ứng "nặng" (cuộn ngang, nghiêng theo chuột...):
 * không bật giảm chuyển động và màn hình rộng từ 1024px.
 * Luôn false ở SSR và lần render đầu để HTML server/client khớp nhau.
 */
export function useHeavyMotion(): boolean {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() =>
        setAllowed(
          allowsHeavyMotion({
            reducedMotion: reduceQuery.matches,
            finePointer: false, // không dùng trong quy tắc này
            width: window.innerWidth,
            webgl: false, // không dùng trong quy tắc này
          }),
        ),
      );
    };
    update();
    window.addEventListener("resize", update);
    reduceQuery.addEventListener("change", update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", update);
      reduceQuery.removeEventListener("change", update);
    };
  }, []);

  return allowed;
}
