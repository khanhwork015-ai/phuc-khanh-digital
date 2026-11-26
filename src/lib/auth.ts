import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { getSqliteDb } from "@/db/sqlite";
import type { UserRole } from "@/db/types";
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

export function createSession(userId: string): { token: string; expiresAt: Date } {
  const rawToken = randomBytes(32).toString("hex");
  const hashedId = hashSessionToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const now = new Date().toISOString();

  const db = getSqliteDb();
  db.prepare("INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)").run(
    hashedId,
    userId,
    expiresAt.toISOString(),
    now,
  );

  return { token: rawToken, expiresAt };
}

export function deleteSessionByToken(rawToken: string): void {
  const hashedId = hashSessionToken(rawToken);
  const db = getSqliteDb();
  db.prepare("DELETE FROM sessions WHERE id = ?").run(hashedId);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!rawToken) return null;

  const hashedId = hashSessionToken(rawToken);
  const db = getSqliteDb();
  const now = new Date().toISOString();

  const row = db
    .prepare(
      `SELECT u.id, u.username, u.role, u.is_active, u.customer_id
       FROM sessions s
       INNER JOIN users u ON s.user_id = u.id
       WHERE s.id = ? AND s.expires_at > ?
       LIMIT 1`,
    )
    .get(hashedId, now) as
    | {
        id: string;
        username: string;
        role: UserRole;
        is_active: number;
        customer_id: string | null;
      }
    | undefined;

  if (!row || row.is_active !== 1) return null;

  return {
    id: row.id,
    username: row.username,
    role: row.role,
    customerId: row.customer_id,
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
