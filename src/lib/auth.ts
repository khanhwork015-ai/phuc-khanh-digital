import { randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/db";
import { sessions, users, type UserRole } from "@/db/schema";
import { SESSION_COOKIE_NAME } from "@/lib/auth-constants";
import { hashPassword, hashSessionToken, verifyPassword } from "@/lib/password";

export { SESSION_COOKIE_NAME, hashPassword, hashSessionToken, verifyPassword };
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type SessionUser = {
  id: string;
  username: string;
  role: UserRole;
  customerId: string | null;
};

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const rawToken = randomBytes(32).toString("hex");
  const hashedId = hashSessionToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  const db = getDb();
  await db.insert(sessions).values({
    id: hashedId,
    userId,
    expiresAt,
  });

  return { token: rawToken, expiresAt };
}

export async function deleteSessionByToken(rawToken: string): Promise<void> {
  const hashedId = hashSessionToken(rawToken);
  const db = getDb();
  await db.delete(sessions).where(eq(sessions.id, hashedId));
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!rawToken) return null;

  const hashedId = hashSessionToken(rawToken);
  const db = getDb();
  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      role: users.role,
      isActive: users.isActive,
      customerId: users.customerId,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.id, hashedId), gt(sessions.expiresAt, new Date())))
    .limit(1);

  const user = rows[0];
  if (!user || !user.isActive) return null;

  return {
    id: user.id,
    username: user.username,
    role: user.role,
    customerId: user.customerId,
  };
}

export function buildSessionCookieOptions(expiresAt: Date) {
  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  };
}
