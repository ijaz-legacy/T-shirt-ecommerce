import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
import type {
  Client,
  InStatement,
  ResultSet,
} from "@libsql/client";
import { SEED_PRODUCTS } from "@/lib/seed-products";

const globalForDb = globalThis as unknown as {
  __ijazDb?: Promise<Client>;
};

const SCHEMA: InStatement[] = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer',
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  "CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash)",
  `CREATE TABLE IF NOT EXISTS products (
    slug TEXT PRIMARY KEY,
    name_en TEXT NOT NULL,
    name_ta TEXT NOT NULL,
    desc_en TEXT NOT NULL,
    desc_ta TEXT NOT NULL,
    price INTEGER NOT NULL,
    image TEXT NOT NULL,
    color_en TEXT NOT NULL,
    color_ta TEXT NOT NULL,
    color_hex TEXT NOT NULL,
    category TEXT NOT NULL,
    badge TEXT,
    featured INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 25,
    active INTEGER NOT NULL DEFAULT 1,
    updated_at INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS product_images (
    id TEXT PRIMARY KEY,
    mime TEXT NOT NULL,
    bytes BLOB NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    order_number TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'placed',
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address1 TEXT NOT NULL,
    address2 TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    pincode TEXT NOT NULL,
    subtotal INTEGER NOT NULL,
    shipping_fee INTEGER NOT NULL,
    total INTEGER NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'cod',
    idempotency_key TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE(user_id, idempotency_key)
  )`,
  "CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id, created_at)",
  "CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status, created_at)",
  `CREATE TABLE IF NOT EXISTS order_status_events (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    note TEXT,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_order_events_order
    ON order_status_events(order_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    product_slug TEXT,
    name_en TEXT NOT NULL,
    name_ta TEXT NOT NULL,
    size TEXT NOT NULL,
    color_en TEXT NOT NULL,
    color_ta TEXT NOT NULL,
    image TEXT,
    custom_config TEXT,
    quantity INTEGER NOT NULL,
    unit_price INTEGER NOT NULL
  )`,
  "CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id)",
];

function databaseConfig(): {
  url: string;
  authToken?: string;
  local: boolean;
} {
  const remoteUrl = process.env.TURSO_DATABASE_URL?.trim();
  if (remoteUrl) {
    return {
      url: remoteUrl,
      authToken: process.env.TURSO_AUTH_TOKEN?.trim() || undefined,
      local: false,
    };
  }

  const dbPath =
    process.env.IJAZ_DB_PATH ??
    path.join(process.cwd(), "data", "ijaz-legacy.db");
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  return { url: pathToFileURL(dbPath).href, local: true };
}

async function createClientInstance(): Promise<Client> {
  const { url, authToken, local } = databaseConfig();
  const { createClient } = local
    ? await import("@libsql/client")
    : await import("@libsql/client/web");

  const client = createClient({
    url,
    authToken,
    intMode: "number",
    timeout: 5000,
  });

  if (local) {
    await client.execute("PRAGMA journal_mode = WAL");
    await client.execute("PRAGMA foreign_keys = ON");
  }

  await client.batch(SCHEMA, "write");
  await migrate(client);
  await client.execute(
    "CREATE INDEX IF NOT EXISTS idx_products_active_sort ON products(active, sort_order)",
  );
  await seedProducts(client);
  return client;
}

async function addColumnIfMissing(
  client: Client,
  table: "users" | "products",
  column: string,
  definition: string,
): Promise<void> {
  const columns = await client.execute(`PRAGMA table_info(${table})`);
  if (!columns.rows.some((row) => row.name === column)) {
    await client.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

async function migrate(client: Client): Promise<void> {
  await addColumnIfMissing(
    client,
    "users",
    "role",
    "TEXT NOT NULL DEFAULT 'customer'",
  );
  await addColumnIfMissing(
    client,
    "products",
    "stock",
    "INTEGER NOT NULL DEFAULT 25",
  );
  await addColumnIfMissing(
    client,
    "products",
    "active",
    "INTEGER NOT NULL DEFAULT 1",
  );
  await addColumnIfMissing(
    client,
    "products",
    "updated_at",
    "INTEGER NOT NULL DEFAULT 0",
  );
  await client.execute({
    sql: "UPDATE products SET updated_at = ? WHERE updated_at = 0",
    args: [Date.now()],
  });

  const ordersWithoutEvents = await client.execute(
    `SELECT o.id AS id, o.status AS status, o.created_at AS createdAt
     FROM orders o
     WHERE NOT EXISTS (
       SELECT 1 FROM order_status_events e WHERE e.order_id = o.id
     )`,
  );
  if (ordersWithoutEvents.rows.length === 0) return;

  const statusPath: Record<string, string[]> = {
    placed: ["placed"],
    processing: ["placed", "processing"],
    shipped: ["placed", "processing", "shipped"],
    delivered: ["placed", "processing", "shipped", "delivered"],
    cancelled: ["placed", "cancelled"],
  };

  const transaction = await client.transaction("write");
  try {
    for (const order of ordersWithoutEvents.rows) {
      const id = String(order.id);
      const status = String(order.status);
      const createdAt = Number(order.createdAt);
      const path = statusPath[status] ?? [status];
      for (const [index, step] of path.entries()) {
        await transaction.execute({
          sql: `INSERT INTO order_status_events
                (id, order_id, status, note, created_at)
                VALUES (?, ?, ?, NULL, ?)`,
          args: [randomUUID(), id, step, createdAt + index],
        });
      }
    }
    await transaction.commit();
  } finally {
    transaction.close();
  }
}

async function seedProducts(client: Client): Promise<void> {
  const result = await client.execute(
    "SELECT COUNT(*) AS count FROM products",
  );
  if (Number(result.rows[0]?.count ?? 0) > 0) return;

  const now = Date.now();
  const statements: InStatement[] = SEED_PRODUCTS.map((product) => ({
    sql: `INSERT OR IGNORE INTO products (
      slug, name_en, name_ta, desc_en, desc_ta, price, image,
      color_en, color_ta, color_hex, category, badge, featured,
      sort_order, stock, active, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 25, 1, ?)`,
    args: [
      product.slug,
      product.nameEn,
      product.nameTa,
      product.descEn,
      product.descTa,
      product.price,
      product.image,
      product.colorEn,
      product.colorTa,
      product.colorHex,
      product.category,
      product.badge ?? null,
      product.featured ? 1 : 0,
      product.sortOrder,
      now,
    ],
  }));

  await client.batch(statements, "write");
}

export function getDb(): Promise<Client> {
  if (!globalForDb.__ijazDb) {
    globalForDb.__ijazDb = createClientInstance().catch((error: unknown) => {
      globalForDb.__ijazDb = undefined;
      throw error;
    });
  }
  return globalForDb.__ijazDb;
}

export function firstRow<T>(result: ResultSet): T | undefined {
  return result.rows[0] as unknown as T | undefined;
}

export function allRows<T>(result: ResultSet): T[] {
  return result.rows as unknown as T[];
}
