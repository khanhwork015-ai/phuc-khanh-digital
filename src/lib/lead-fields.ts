import type { FieldErrors, Resolver } from "react-hook-form";

/**
 * Quy tắc form tư vấn dùng chung cho trình duyệt và server.
 * File này KHÔNG import zod để giữ JS tải về trình duyệt nhẹ (zod ~60 kB chỉ dùng ở server, xem lead-schema.ts).
 */

export const leadPlanValues = ["standard", "growth", "custom"] as const;
export type LeadPlanValue = (typeof leadPlanValues)[number];

export const leadPlanLabels: Record<LeadPlanValue, string> = {
  standard: "Gói Khởi Động (Standard)",
  growth: "Gói Tăng Trưởng (Growth)",
  custom: "Gói Đa Kênh / Theo Yêu Cầu",
};

export const LEAD_LIMITS = { nameMin: 2, nameMax: 80, fanpageMax: 300, honeypotMax: 200 } as const;

export const VN_PHONE_REGEX = /^(0|\+84)(3|5|7|8|9)\d{8}$/;
export const FANPAGE_REGEX = /^(https?:\/\/)?([\w-]+\.)+[a-z]{2,}(\/\S*)?$/i;

export const leadMessages = {
  nameMin: "Vui lòng nhập họ và tên (tối thiểu 2 ký tự).",
  nameMax: "Họ và tên không vượt quá 80 ký tự.",
  phone: "Số điện thoại Việt Nam chưa hợp lệ (VD: 0909123456).",
  fanpageMax: "Đường dẫn Fanpage quá dài.",
  fanpageFormat: "Link Fanpage chưa đúng định dạng (VD: facebook.com/ten-fanpage).",
  plan: "Vui lòng chọn gói vận hành bạn đang quan tâm.",
} as const;

/** Chuẩn hóa SĐT Việt Nam: bỏ khoảng trắng, dấu chấm, dấu gạch ngang, ngoặc. */
export function normalizeVietnamPhone(raw: string): string {
  return raw.replace(/[\s.\-()]/g, "");
}

export type LeadFormValues = {
  fullName: string;
  phone: string;
  fanpageUrl: string;
  plan: LeadPlanValue;
  /** Trường ẩn chống spam (honeypot). Người dùng thật không điền ô này. */
  website: string;
};

type FieldKey = keyof LeadFormValues;

/** Kiểm tra form phía trình duyệt, cùng quy tắc với leadSchema (zod) ở server. */
export function validateLead(input: Partial<Record<FieldKey, unknown>>):
  | { ok: true; data: LeadFormValues }
  | { ok: false; errors: Partial<Record<FieldKey, string>> } {
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const errors: Partial<Record<FieldKey, string>> = {};

  const fullName = str(input.fullName).trim();
  if (fullName.length < LEAD_LIMITS.nameMin) errors.fullName = leadMessages.nameMin;
  else if (fullName.length > LEAD_LIMITS.nameMax) errors.fullName = leadMessages.nameMax;

  const phone = normalizeVietnamPhone(str(input.phone).trim());
  if (!VN_PHONE_REGEX.test(phone)) errors.phone = leadMessages.phone;

  const fanpageUrl = str(input.fanpageUrl).trim();
  if (fanpageUrl.length > LEAD_LIMITS.fanpageMax) errors.fanpageUrl = leadMessages.fanpageMax;
  else if (fanpageUrl !== "" && !FANPAGE_REGEX.test(fanpageUrl)) errors.fanpageUrl = leadMessages.fanpageFormat;

  const plan = str(input.plan);
  if (!(leadPlanValues as readonly string[]).includes(plan)) errors.plan = leadMessages.plan;

  const website = str(input.website).slice(0, LEAD_LIMITS.honeypotMax);

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data: { fullName, phone, fanpageUrl, plan: plan as LeadPlanValue, website } };
}

/** Resolver cho react-hook-form dựa trên validateLead. */
export const leadFormResolver: Resolver<LeadFormValues> = async (values) => {
  const result = validateLead(values);
  if (result.ok) return { values: result.data, errors: {} };

  const errors: FieldErrors<LeadFormValues> = {};
  for (const [key, message] of Object.entries(result.errors)) {
    (errors as Record<string, { type: string; message: string }>)[key] = { type: "validate", message };
  }
  return { values: {}, errors };
};
