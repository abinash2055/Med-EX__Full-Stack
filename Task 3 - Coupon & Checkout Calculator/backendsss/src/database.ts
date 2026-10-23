
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import type { CheckoutData } from "./types";

const candidates = [
  path.resolve(__dirname, "../data/checkout.json"),
  path.resolve(process.cwd(), "data/checkout.json"),
  path.resolve(process.cwd(), "backend/data/checkout.json")
];

const dataPath = candidates.find((candidate) =>
  fs.existsSync(candidate)
);

if (!dataPath) {
  throw new Error(
    "checkout.json not found. Place it in backend/data/checkout.json."
  );
}

export const seed = JSON.parse(
  fs.readFileSync(dataPath, "utf8")
) as CheckoutData;

const dbPath =
  process.env.DB_PATH ??
  path.resolve(process.cwd(), "medex.sqlite");

export const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id TEXT,
    request_json TEXT NOT NULL,
    quote_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS coupon_usage (
    coupon_code TEXT NOT NULL,
    customer_id TEXT NOT NULL DEFAULT '',
    used_count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (coupon_code, customer_id)
  );
`);

export function getUsage(
  couponCode: string,
  customerId: string | null
): number {
  const row = db.prepare(`
    SELECT used_count
    FROM coupon_usage
    WHERE coupon_code = ? AND customer_id = ?
  `).get(couponCode.toUpperCase(), customerId ?? "") as
    | { used_count: number }
    | undefined;

  return row?.used_count ?? 0;
}

export function createOrder(
  customerId: string | null,
  request: unknown,
  quote: unknown
) {
  return db.prepare(`
    INSERT INTO orders (customer_id, request_json, quote_json)
    VALUES (?, ?, ?)
  `).run(
    customerId,
    JSON.stringify(request),
    JSON.stringify(quote)
  );
}

export function recordCouponUsage(
  couponCode: string,
  customerId: string | null
) {
  db.prepare(`
    INSERT INTO coupon_usage (coupon_code, customer_id, used_count)
    VALUES (?, ?, 1)
    ON CONFLICT(coupon_code, customer_id)
    DO UPDATE SET used_count = used_count + 1
  `).run(couponCode.toUpperCase(), customerId ?? "");
}
