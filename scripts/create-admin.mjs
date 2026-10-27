import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { createClient } from "@libsql/client";

const [emailArg, passwordArg, nameArg] = process.argv.slice(2);
const email = emailArg?.trim().toLowerCase() ?? "";
const password = passwordArg ?? "";
const name = nameArg?.trim() || "Store admin";

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("Usage: node scripts/create-admin.mjs <email> <password> [name]");
  console.error("A valid email address is required.");
  process.exit(1);
}

if (
  password.length < 8 ||
  password.length > 72 ||
  !/[A-Za-z]/.test(password) ||
  !/[0-9]/.test(password)
) {
  console.error(
    "Password must be 8-72 characters and include a letter and a number.",
  );
  process.exit(1);
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    let value = match[2];
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[match[1]] === undefined) process.env[match[1]] = value;
  }
}

loadEnvFile(path.join(process.cwd(), ".env.local"));

const remoteUrl = process.env.TURSO_DATABASE_URL?.trim();
let url;
if (remoteUrl) {
  url = remoteUrl;
} else {
  const dbPath =
    process.env.IJAZ_DB_PATH ??
    path.join(process.cwd(), "data", "ijaz-legacy.db");
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  url = pathToFileURL(dbPath).href;
}

const client = createClient({
  url,
  authToken: process.env.TURSO_AUTH_TOKEN?.trim() || undefined,
  intMode: "number",
});

function hashPassword(password) {
  const salt = randomBytes(16);
  const N = 16_384;
  const r = 8;
  const p = 1;
  const key = scryptSync(password, salt, 64, {
    N,
    r,
    p,
    maxmem: 64 * 1024 * 1024,
  });
  return [
    "scrypt",
    N,
    r,
    p,
    salt.toString("hex"),
    key.toString("hex"),
  ].join("$");
}

async function main() {
  if (url.startsWith("file:")) {
    await client.execute("PRAGMA journal_mode = WAL");
    await client.execute("PRAGMA foreign_keys = ON");
  }

  await client.batch(
    [
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'customer',
        created_at INTEGER NOT NULL
      )`,
    ],
    "write",
  );

  const columns = await client.execute("PRAGMA table_info(users)");
  if (!columns.rows.some((column) => column.name === "role")) {
    await client.execute(
      "ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'customer'",
    );
  }

  const existing = await client.execute({
    sql: "SELECT id FROM users WHERE email = ?",
    args: [email],
  });
  const existingUser = existing.rows[0];

  if (existingUser) {
    await client.execute({
      sql: "UPDATE users SET role = 'admin' WHERE id = ?",
      args: [existingUser.id],
    });
    console.log(`Promoted existing account ${email} to admin.`);
    console.log("The existing password was not changed.");
    return;
  }

  await client.execute({
    sql: `INSERT INTO users (id, name, email, password_hash, role, created_at)
          VALUES (?, ?, ?, ?, 'admin', ?)`,
    args: [randomUUID(), name, email, hashPassword(password), Date.now()],
  });
  console.log(`Created admin account ${email}.`);
}

main()
  .catch((error) => {
    console.error("Could not create admin account:", error);
    process.exitCode = 1;
  })
  .finally(() => {
    client.close();
  });
