import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { hashPassword } from "@/lib/password";

const globalForSqlite = globalThis as unknown as {
  pkSqlite?: DatabaseSync;
};

function initSchema(db: DatabaseSync) {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      javis_client_slug TEXT UNIQUE,
      page_id TEXT,
      full_name TEXT NOT NULL,
      business_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      fanpage_url TEXT,
      plan TEXT NOT NULL DEFAULT 'standard',
      source TEXT NOT NULL DEFAULT 'offline_contract',
      contract_status TEXT NOT NULL DEFAULT 'active',
      monthly_fee INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      pin_hash TEXT,
      role TEXT NOT NULL DEFAULT 'CUSTOMER',
      is_active INTEGER NOT NULL DEFAULT 1,
      customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
      last_login_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      fanpage_url TEXT NOT NULL DEFAULT '',
      plan TEXT NOT NULL DEFAULT 'standard',
      status TEXT NOT NULL DEFAULT 'new',
      note TEXT,
      synced_to_javis INTEGER NOT NULL DEFAULT 0,
      converted_customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS brand_assets (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      asset_type TEXT NOT NULL DEFAULT 'guideline',
      file_url TEXT,
      metadata TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS content_items (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      javis_item_id TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      caption TEXT NOT NULL,
      media_type TEXT NOT NULL DEFAULT 'image',
      media_urls TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'pending_client',
      client_feedback TEXT,
      scheduled_at TEXT,
      published_at TEXT,
      published_url TEXT,
      updated_at TEXT NOT NULL
    );
  `);

  const userCols = db.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
  if (!userCols.some((c) => c.name === "pin_hash")) {
    db.exec("ALTER TABLE users ADD COLUMN pin_hash TEXT;");
  }

  const adminUsername = process.env.SEED_ADMIN_USERNAME?.trim();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (adminUsername && adminPassword) {
    const existing = db.prepare("SELECT id FROM users WHERE username = ? LIMIT 1").get(adminUsername);
    if (!existing) {
      const now = new Date().toISOString();
      db.prepare(
        "INSERT INTO users (id, username, password_hash, role, is_active, created_at, updated_at) VALUES (?, ?, ?, 'ADMIN', 1, ?, ?)",
      ).run(crypto.randomUUID(), adminUsername, hashPassword(adminPassword), now, now);
    }
  }
}

export function getSqliteDb(): DatabaseSync {
  if (!globalForSqlite.pkSqlite) {
    const dbPath = process.env.LOCAL_DB_PATH?.trim() || path.join(process.cwd(), "data", "phuckhanh.db");
    mkdirSync(path.dirname(dbPath), { recursive: true });
    const db = new DatabaseSync(dbPath);
    initSchema(db);
    globalForSqlite.pkSqlite = db;
  }
  return globalForSqlite.pkSqlite;
}
