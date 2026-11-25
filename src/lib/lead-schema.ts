import { z } from "zod";
import {
  FANPAGE_REGEX,
  LEAD_LIMITS,
  leadMessages,
  leadPlanValues,
  normalizeVietnamPhone,
  VN_PHONE_REGEX,
} from "./lead-fields";

/**
 * Schema zod chỉ dùng ở server (/api/leads). Quy tắc lấy từ lead-fields.ts
 * để trùng khớp với phần kiểm tra phía trình duyệt.
 */
export const leadSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(LEAD_LIMITS.nameMin, leadMessages.nameMin)
    .max(LEAD_LIMITS.nameMax, leadMessages.nameMax),
  phone: z
    .string()
    .trim()
    .transform(normalizeVietnamPhone)
    .refine((val) => VN_PHONE_REGEX.test(val), { message: leadMessages.phone }),
  fanpageUrl: z
    .string()
    .trim()
    .max(LEAD_LIMITS.fanpageMax, leadMessages.fanpageMax)
    .refine((val) => val === "" || FANPAGE_REGEX.test(val), { message: leadMessages.fanpageFormat })
    .optional()
    .default(""),
  plan: z.enum(leadPlanValues, { message: leadMessages.plan }),
  website: z.string().max(LEAD_LIMITS.honeypotMax).optional().default(""),
});
