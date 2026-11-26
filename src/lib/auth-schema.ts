import { z } from "zod";
import { userRoles } from "@/db/types";

export const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Vui lòng nhập tên đăng nhập (tối thiểu 3 ký tự).")
    .max(50, "Tên đăng nhập không vượt quá 50 ký tự."),
  password: z
    .string()
    .min(6, "Vui lòng nhập mật khẩu (tối thiểu 6 ký tự).")
    .max(128, "Mật khẩu không vượt quá 128 ký tự."),
});

export const createAccountSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, "Tên đăng nhập tối thiểu 3 ký tự.")
      .max(50, "Tên đăng nhập tối đa 50 ký tự.")
      .regex(/^[a-zA-Z0-9._-]+$/, "Tên đăng nhập chỉ chứa chữ, số, dấu chấm, gạch dưới hoặc gạch ngang."),
    password: z
      .string()
      .min(8, "Mật khẩu tối thiểu 8 ký tự.")
      .max(128, "Mật khẩu tối đa 128 ký tự."),
    role: z.enum(userRoles).default("CUSTOMER"),
    customerId: z.string().uuid("Khách hàng liên kết không hợp lệ.").optional().or(z.literal("")),
  })
  .refine((data) => data.role !== "CUSTOMER" || Boolean(data.customerId), {
    message: "Tài khoản Khách hàng bắt buộc phải gắn với một hồ sơ khách hàng.",
    path: ["customerId"],
  });

export const updateAccountSchema = z
  .object({
    isActive: z.boolean().optional(),
    currentPassword: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại.").optional(),
    newPassword: z
      .string()
      .min(8, "Mật khẩu mới tối thiểu 8 ký tự.")
      .max(128, "Mật khẩu mới tối đa 128 ký tự.")
      .optional(),
  })
  .refine((data) => !data.newPassword || Boolean(data.currentPassword), {
    message: "Vui lòng nhập mật khẩu hiện tại để xác nhận đổi mật khẩu.",
    path: ["currentPassword"],
  });
