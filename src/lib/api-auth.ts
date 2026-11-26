import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import type { UserRole } from "@/db/types";
import { getSessionUser, type SessionUser } from "@/lib/auth";
import { canManageCustomers, isDashboardRole } from "@/lib/permissions";

export async function requireSessionApi(): Promise<
  { ok: true; user: SessionUser } | { ok: false; response: NextResponse }
> {
  const user = await getSessionUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, message: "Vui lòng đăng nhập để tiếp tục." }, { status: 401 }),
    };
  }
  return { ok: true, user };
}

export async function requireRoleApi(
  check: (role: UserRole) => boolean,
): Promise<{ ok: true; user: SessionUser } | { ok: false; response: NextResponse }> {
  const session = await requireSessionApi();
  if (!session.ok) return session;
  if (!check(session.user.role)) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, message: "Bạn không có quyền thực hiện thao tác này." }, { status: 403 }),
    };
  }
  return session;
}

export function requireDashboardReadApi() {
  return requireRoleApi(isDashboardRole);
}

export function requireCustomerManageApi() {
  return requireRoleApi(canManageCustomers);
}

export function requireAdminApi() {
  return requireRoleApi((role) => role === "ADMIN");
}

export function verifyJavisSyncKey(req: Request): boolean {
  const expected = process.env.JAVIS_SYNC_API_KEY;
  if (!expected) return false;
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) return false;
  const expectedBuf = Buffer.from(expected, "utf8");
  const tokenBuf = Buffer.from(token, "utf8");
  if (expectedBuf.length !== tokenBuf.length) return false;
  return timingSafeEqual(expectedBuf, tokenBuf);
}
