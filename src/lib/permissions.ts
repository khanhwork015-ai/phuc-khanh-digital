import type { UserRole } from "../db/types.ts";

export const roleLabels: Record<UserRole, string> = {
  ADMIN: "Admin (Toàn quyền)",
  DIRECTOR: "Ban lãnh đạo (Chỉ xem)",
  MODERATOR: "Moderator (Quản lý khách hàng)",
  CUSTOMER: "Khách hàng",
};

export function isDashboardRole(role: UserRole): boolean {
  return role === "ADMIN" || role === "DIRECTOR" || role === "MODERATOR";
}

export function canManageContent(role: UserRole): boolean {
  return role === "ADMIN";
}

export function canManageLeads(role: UserRole): boolean {
  return role === "ADMIN";
}

export function canManageCustomers(role: UserRole): boolean {
  return role === "ADMIN" || role === "MODERATOR";
}

export function canManageAccounts(role: UserRole): boolean {
  return role === "ADMIN";
}
