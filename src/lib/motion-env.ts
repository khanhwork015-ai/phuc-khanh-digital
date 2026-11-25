import type { LenisOptions } from "lenis";

/**
 * Quy tắc chung: thiết bị nào được chạy cuộn mượt, hiệu ứng nặng, 3D.
 * File thuần, không import alias "@/" để chạy được bằng `node --test`.
 */

/** Bật cuộn mượt (Lenis syncTouch) trên màn cảm ứng. Đặt false để tắt bằng một dòng. */
export const SMOOTH_SCROLL_TOUCH = true;
export const LENIS_DESKTOP_LERP = 0.065;
export const LENIS_TOUCH_LERP = 0.075;
export const HEAVY_MOTION_MIN_WIDTH = 1024;

export type MotionEnv = {
  reducedMotion: boolean;
  finePointer: boolean;
  width: number;
  webgl: boolean;
};

/** Tạo thử một WebGL context rồi trả lại ngay cho GPU. Tốn kém: chỉ gọi khi needsWebGLProbe() đúng. */
function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return Boolean(gl);
  } catch {
    return false;
  }
}

/** Các điều kiện rẻ cho 3D đã đạt chưa (dùng để quyết định có cần dò WebGL hay không). */
export function needsWebGLProbe(env: Pick<MotionEnv, "reducedMotion" | "finePointer" | "width">): boolean {
  return env.finePointer && env.width >= HEAVY_MOTION_MIN_WIDTH && !env.reducedMotion;
}

/**
 * Chỉ gọi ở client. Mặc định KHÔNG dò WebGL (webgl = false): tạo WebGL context chặn luồng chính đáng kể
 * (đo được: làm mất ~10 điểm Lighthouse mobile). Truyền { probeWebGL: true } khi thật sự cần quyết định 3D;
 * khi đó chỉ dò nếu needsWebGLProbe() đúng.
 */
export function readMotionEnv(options: { probeWebGL?: boolean } = {}): MotionEnv {
  const base = {
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    finePointer: window.matchMedia("(hover: hover) and (pointer: fine)").matches,
    width: window.innerWidth,
  };
  return { ...base, webgl: options.probeWebGL === true && needsWebGLProbe(base) && hasWebGL() };
}

export function allowsHeavyMotion(env: MotionEnv): boolean {
  return !env.reducedMotion && env.width >= HEAVY_MOTION_MIN_WIDTH;
}

export function canUse3D(env: MotionEnv): boolean {
  return env.finePointer && env.width >= HEAVY_MOTION_MIN_WIDTH && env.webgl && !env.reducedMotion;
}

/**
 * Chế độ 3D rút gọn cho mobile/tablet: chỉ cần WebGL và không bật giảm chuyển động.
 * Dùng ít hạt hơn, DPR thấp hơn và không lắng nghe con trỏ chuột.
 */
export function canUseLite3D(env: Pick<MotionEnv, "reducedMotion" | "webgl">): boolean {
  return env.webgl && !env.reducedMotion;
}

export function getLenisOptions(env: MotionEnv, touchEnabled: boolean): LenisOptions | null {
  if (env.reducedMotion) return null;
  if (!env.finePointer && !touchEnabled) return null;

  const base: LenisOptions = {
    lerp: LENIS_DESKTOP_LERP,
    smoothWheel: true,
    // Lenis đã tính scroll-padding-top (72px trong globals.css); thêm offset ở đây sẽ bị cộng hai lần
    anchors: true,
  };
  if (env.finePointer) return base;

  return { ...base, syncTouch: true, syncTouchLerp: LENIS_TOUCH_LERP, touchInertiaExponent: 1.5 };
}
