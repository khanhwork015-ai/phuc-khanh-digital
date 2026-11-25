/**
 * Design tokens tập trung cho Phúc Khánh Digital.
 * Các giá trị này được phản chiếu sang Tailwind qua khối @theme trong globals.css.
 * Khi đổi màu ở đây, nhớ cập nhật biến tương ứng trong globals.css.
 */
export const colors = {
  bgCanvas: "#09090B",
  bgSurface: "#111113",
  bgElevated: "#18181B",
  borderSubtle: "rgba(255, 255, 255, 0.08)",
  borderStrong: "rgba(255, 255, 255, 0.16)",
  borderAccent: "rgba(233, 190, 87, 0.35)",
  textPrimary: "#FAFAFA",
  textBrandIvory: "#F8ECDE",
  textSecondary: "#A1A1AA",
  textMuted: "#8E8E98",
  accentPrimary: "#E9BE57",
  accentHover: "#F2CE72",
  accentMuted: "rgba(233, 190, 87, 0.14)",
} as const;

export const radii = {
  xl: "12px",
  "2xl": "16px",
} as const;

/** Đường cong chuẩn cho mọi chuyển động reveal / chuyển tab. */
export const easeOutExpo = [0.22, 1, 0.36, 1] as const;

export const motionTokens = {
  reveal: { y: 16, duration: 0.45, ease: easeOutExpo },
  crossFade: { duration: 0.25 },
  spring: { type: "spring", stiffness: 380, damping: 32 },
  lenisLerp: 0.08,
} as const;

export type ColorToken = keyof typeof colors;
