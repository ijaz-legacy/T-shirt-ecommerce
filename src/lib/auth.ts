import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt,
  timingSafeEqual,
} from "node:crypto";
import { firstRow, getDb } from "@/lib/db";
import type { UserPublic, UserRole } from "@/lib/types";

export const SESSION_COOKIE = "ijaz_sid";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const SCRYPT_N = 16_384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;
const MAX_MEM = 64 * 1024 * 1024;

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      KEY_LENGTH,
      { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: MAX_MEM },
      (error, key) => {
        if (error) reject(error);
        else resolve(key as Buffer);
      },
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt);
  return [
    "scrypt",
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString("hex"),
    key.toString("hex"),
  ].join("$");
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  try {
    const parts = stored.split("$");
    if (parts.length !== 6 || parts[0] !== "scrypt") return false;
    const n = Number(parts[1]);
    const r = Number(parts[2]);
    const p = Number(parts[3]);
    if (n !== SCRYPT_N || r !== SCRYPT_R || p !== SCRYPT_P) return false;
    const salt = Buffer.from(parts[4], "hex");
    const expected = Buffer.from(parts[5], "hex");
    if (salt.length === 0 || expected.length !== KEY_LENGTH) return false;
    const key = await deriveKey(password, salt);
    return timingSafeEqual(key, expected);
  } catch {
    return false;
  }
}

let dummyHash: Promise<string> | null = null;

export async function verifyAgainstDummyHash(password: string): Promise<void> {
  dummyHash ??= hashPassword("ijaz-legacy-timing-equalizer-9x");
  await verifyPassword(password, await dummyHash);
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string): Promise<{
  token: string;
  expiresAt: number;
}> {
  const client = await getDb();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const now = Date.now();

  await client.batch(
    [
      {
        sql: "DELETE FROM sessions WHERE expires_at <= ?",
        args: [now],
      },
      {
        sql: `INSERT INTO sessions
              (id, user_id, token_hash, expires_at, created_at)
              VALUES (?, ?, ?, ?, ?)`,
        args: [randomUUID(), userId, hashToken(token), expiresAt, now],
      },
    ],
    "write",
  );

  return { token, expiresAt };
}

export async function getSessionUser(token: string): Promise<UserPublic | null> {
  if (!token) return null;
  const client = await getDb();
  const result = await client.execute({
    sql: `SELECT u.id AS id, u.name AS name, u.email AS email, u.role AS role
          FROM sessions s
          JOIN users u ON u.id = s.user_id
          WHERE s.token_hash = ? AND s.expires_at > ?`,
    args: [hashToken(token), Date.now()],
  });
  return firstRow<UserPublic>(result) ?? null;
}

export async function deleteSession(token: string): Promise<void> {
  if (!token) return;
  const client = await getDb();
  await client.execute({
    sql: "DELETE FROM sessions WHERE token_hash = ?",
    args: [hashToken(token)],
  });
}

export async function findUserByEmail(email: string): Promise<{
  id: string;
  name: string;
  email: string;
  role: UserRole;
  passwordHash: string;
} | null> {
  const client = await getDb();
  const result = await client.execute({
    sql: `SELECT id, name, email, role, password_hash AS passwordHash
          FROM users WHERE email = ?`,
    args: [email],
  });
  return firstRow<{
    id: string;
    name: string;
    email: string;
    role: UserRole;
    passwordHash: string;
  }>(result) ?? null;
}

export async function createUser(input: {
  name: string;
  email: string;
  passwordHash: string;
}): Promise<UserPublic> {
  const client = await getDb();
  const user: UserPublic = {
    id: randomUUID(),
    name: input.name,
    email: input.email,
    role: "customer",
  };
  await client.execute({
    sql: `INSERT INTO users
          (id, name, email, password_hash, role, created_at)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      user.id,
      user.name,
      user.email,
      input.passwordHash,
      user.role,
      Date.now(),
    ],
  });
  return user;
}
