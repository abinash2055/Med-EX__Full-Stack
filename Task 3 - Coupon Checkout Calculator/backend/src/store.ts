import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const dataDirectory = path.resolve(process.cwd(), "data");
const databasePath = path.join(dataDirectory, "checkout.sqlite");
const jsonPath = path.join(dataDirectory, "checkout.json");

if (!fs.existsSync(jsonPath)) {
  throw new Error(
    "Missing data/checkout.json. Save the supplied checkout data there."
  );
}

const db = new Database(databasePath);

db.pragma("journal_mode = WAL");
db.pragma("busy_timeout = 5000");

db.exec(`
  CREATE TABLE IF NOT EXISTS app_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    data TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    customer_id TEXT,
    created_at TEXT NOT NULL,
    total TEXT NOT NULL,
    quote TEXT NOT NULL
  );
`);

const existing = db
  .prepare("SELECT id FROM app_state WHERE id = 1")
  .get();

if (!existing) {
  const initialData = JSON.parse(
    fs.readFileSync(jsonPath, "utf8")
  );

  initialData.orders = [];

  db.prepare(
    "INSERT INTO app_state (id, data) VALUES (1, ?)"
  ).run(JSON.stringify(initialData));
}

export function getState(): any {
  const row = db
    .prepare("SELECT data FROM app_state WHERE id = 1")
    .get() as { data: string };

  return JSON.parse(row.data);
}

export function saveState(data: any): void {
  db.prepare(
    "UPDATE app_state SET data = ? WHERE id = 1"
  ).run(JSON.stringify(data));
}

export function recordOrder(
  orderId: string,
  customerId: string | null,
  createdAt: string,
  total: string,
  quote: any
): void {
  db.prepare(`
    INSERT INTO orders (id, customer_id, created_at, total, quote)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    orderId,
    customerId,
    createdAt,
    total,
    JSON.stringify(quote)
  );
}

export function transaction<T>(callback: () => T): T {
  return db.transaction(callback).immediate() as T;
}