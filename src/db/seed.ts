import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { hashPassword } from "../lib/password.ts";
import { users } from "./schema.ts";

const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("Thiếu DATABASE_URL trong biến môi trường.");
}
const pool = new Pool({ connectionString });

async function seedAdmin() {
  const username = process.env.SEED_ADMIN_USERNAME?.trim();
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!username || !password) {
    throw new Error("Thiếu SEED_ADMIN_USERNAME hoặc SEED_ADMIN_PASSWORD trong biến môi trường.");
  }

  const db = drizzle(pool);
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);

  if (existing.length > 0) {
    console.log(`Admin "${username}" đã tồn tại, bỏ qua seed.`);
    return;
  }

  await db.insert(users).values({
    username,
    passwordHash: hashPassword(password),
    role: "ADMIN",
    isActive: true,
  });

  console.log(`Đã khởi tạo tài khoản Admin "${username}".`);
}

seedAdmin()
  .catch((err) => {
    console.error("Seed thất bại:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
