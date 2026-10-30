import { randomUUID } from "node:crypto";
import { allRows, firstRow, getDb } from "@/lib/db";
import type { StickerCategory } from "@/lib/catalog";
import type { SavedDesignConfig } from "@/lib/types";
import { savedDesignConfigSchema } from "@/lib/validation";

export interface UserDesign {
  id: string;
  userId: string;
  imageId: string | null;
  image: string | null;
  name: string;
  category: StickerCategory;
  createdAt: number;
  updatedAt: number;
  config: SavedDesignConfig | null;
}

interface UserDesignRow {
  id: string;
  user_id: string;
  image_id: string | null;
  name: string;
  category: string;
  created_at: number;
  updated_at: number;
  config_json: string | null;
}

function mapDesign(row: UserDesignRow): UserDesign {
  const category: StickerCategory =
    row.category === "medium" || row.category === "large"
      ? row.category
      : "small";
  let config: SavedDesignConfig | null = null;
  if (row.config_json) {
    try {
      const parsed = savedDesignConfigSchema.safeParse(JSON.parse(row.config_json));
      if (parsed.success) config = parsed.data;
      else console.warn("Ignoring invalid saved design configuration", row.id);
    } catch (error) {
      console.warn("Could not parse saved design configuration", row.id, error);
    }
  }
  const imageId = row.image_id || null;
  return {
    id: row.id,
    userId: row.user_id,
    imageId,
    image: imageId ? `/api/images/${imageId}` : null,
    name: row.name,
    category,
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
    config,
  };
}

export async function listUserDesigns(userId: string): Promise<UserDesign[]> {
  const client = await getDb();
  const result = await client.execute({
    sql: "SELECT * FROM user_designs WHERE user_id = ? ORDER BY updated_at DESC, created_at DESC",
    args: [userId],
  });
  return allRows<UserDesignRow>(result).map(mapDesign);
}

export async function createUserDesign(
  userId: string,
  imageId: string,
  name: string,
  category: StickerCategory,
): Promise<UserDesign> {
  const client = await getDb();
  const id = randomUUID();
  const now = Date.now();
  await client.execute({
    sql: `INSERT INTO user_designs
          (id, user_id, image_id, name, category, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [id, userId, imageId, name, category, now, now],
  });
  return {
    id,
    userId,
    imageId,
    image: `/api/images/${imageId}`,
    name,
    category,
    createdAt: now,
    updatedAt: now,
    config: null,
  };
}

export async function createSavedUserDesign(
  userId: string,
  name: string,
  config: SavedDesignConfig,
): Promise<UserDesign> {
  const client = await getDb();
  const id = randomUUID();
  const now = Date.now();
  await client.execute({
    sql: `INSERT INTO user_designs
          (id, user_id, image_id, name, category, created_at, updated_at, config_json)
          VALUES (?, ?, '', ?, 'medium', ?, ?, ?)`,
    args: [id, userId, name, now, now, JSON.stringify(config)],
  });
  return {
    id,
    userId,
    imageId: null,
    image: null,
    name,
    category: "medium",
    createdAt: now,
    updatedAt: now,
    config,
  };
}

export async function getUserDesign(
  userId: string,
  designId: string,
): Promise<UserDesign | null> {
  const client = await getDb();
  const result = await client.execute({
    sql: "SELECT * FROM user_designs WHERE id = ? AND user_id = ?",
    args: [designId, userId],
  });
  const row = firstRow<UserDesignRow>(result);
  return row ? mapDesign(row) : null;
}

export async function updateSavedUserDesign(
  userId: string,
  designId: string,
  name: string,
  config: SavedDesignConfig,
): Promise<boolean> {
  const client = await getDb();
  const result = await client.execute({
    sql: `UPDATE user_designs
          SET name = ?, config_json = ?, updated_at = ?
          WHERE id = ? AND user_id = ? AND config_json IS NOT NULL`,
    args: [name, JSON.stringify(config), Date.now(), designId, userId],
  });
  return result.rowsAffected > 0;
}

export async function listAdminCustomerDesigns(): Promise<
  { id: string; name: string; email: string; createdAt: number; designs: UserDesign[] }[]
> {
  const client = await getDb();
  const result = await client.execute(
    `SELECT
       u.id AS user_id, u.name AS user_name, u.email AS user_email,
       u.created_at AS user_created_at,
       d.id, d.user_id AS design_user_id, d.image_id, d.name, d.category, d.created_at,
       d.updated_at, d.config_json
     FROM users u
     LEFT JOIN user_designs d
       ON d.user_id = u.id AND d.config_json IS NOT NULL
     WHERE u.role = 'customer'
     ORDER BY u.created_at DESC, d.updated_at DESC`,
  );
  const customers = new Map<
    string,
    { id: string; name: string; email: string; createdAt: number; designs: UserDesign[] }
  >();
  for (const row of allRows<Omit<UserDesignRow, "user_id"> & {
    user_id: string;
    design_user_id: string | null;
    user_name: string;
    user_email: string;
    user_created_at: number;
  }>(result)) {
    let customer = customers.get(row.user_id);
    if (!customer) {
      customer = {
        id: row.user_id,
        name: row.user_name,
        email: row.user_email,
        createdAt: row.user_created_at,
        designs: [],
      };
      customers.set(row.user_id, customer);
    }
    if (row.id && row.design_user_id) {
      customer.designs.push(mapDesign({
        ...row,
        user_id: row.design_user_id,
      }));
    }
  }
  return [...customers.values()];
}

export async function deleteUserDesign(
  userId: string,
  designId: string,
): Promise<boolean> {
  const client = await getDb();
  const result = await client.execute({
    sql: "DELETE FROM user_designs WHERE id = ? AND user_id = ?",
    args: [designId, userId],
  });
  return result.rowsAffected > 0;
}

export async function countUserDesigns(userId: string): Promise<number> {
  const client = await getDb();
  const result = await client.execute({
    sql: "SELECT COUNT(*) AS count FROM user_designs WHERE user_id = ? AND config_json IS NOT NULL",
    args: [userId],
  });
  const row = firstRow<{ count: number }>(result);
  return Number(row?.count ?? 0);
}
