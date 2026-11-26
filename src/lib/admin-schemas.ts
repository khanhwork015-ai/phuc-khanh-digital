import { z } from "zod";
import { contractStatuses, customerSources, leadStatuses } from "@/db/schema";
import { leadPlanValues } from "@/lib/lead-fields";

export const updateLeadSchema = z.object({
  status: z.enum(leadStatuses).optional(),
  note: z.string().max(1000, "Ghi chú tối đa 1000 ký tự.").optional(),
});

export const convertLeadSchema = z.object({
  businessName: z.string().trim().min(2, "Vui lòng nhập tên thương hiệu / doanh nghiệp.").max(120),
  javisClientSlug: z
    .string()
    .trim()
    .max(80)
    .regex(/^[a-z0-9-]*$/, "Slug Javis chỉ chứa chữ thường, số và dấu gạch ngang.")
    .optional(),
  monthlyFee: z.coerce.number().int().min(0).max(500_000_000).default(0),
});

export const createCustomerSchema = z.object({
  fullName: z.string().trim().min(2, "Họ tên tối thiểu 2 ký tự.").max(100),
  businessName: z.string().trim().min(2, "Tên thương hiệu tối thiểu 2 ký tự.").max(120),
  phone: z.string().trim().min(8, "Số điện thoại chưa hợp lệ.").max(20),
  email: z.string().trim().email("Email không hợp lệ.").max(120).optional().or(z.literal("")),
  fanpageUrl: z.string().trim().max(300).optional().or(z.literal("")),
  plan: z.enum(leadPlanValues).default("standard"),
  source: z.enum(customerSources).default("offline_contract"),
  contractStatus: z.enum(contractStatuses).default("active"),
  monthlyFee: z.coerce.number().int().min(0).max(500_000_000).default(0),
  javisClientSlug: z
    .string()
    .trim()
    .max(80)
    .regex(/^[a-z0-9-]*$/, "Slug Javis chỉ chứa chữ thường, số và dấu gạch ngang.")
    .optional()
    .or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

export const updateCustomerSchema = createCustomerSchema.partial();
