import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  pkPool?: Pool;
};

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL chưa được cấu hình trong biến môi trường.");
  }
  return new Pool({
    connectionString,
    max: 10,
  });
}

export function getPool(): Pool {
  if (!globalForDb.pkPool) {
    globalForDb.pkPool = createPool();
  }
  return globalForDb.pkPool;
}

export function getDb() {
  return drizzle(getPool(), { schema });
}
