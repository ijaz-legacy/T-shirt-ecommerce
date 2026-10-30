import { randomUUID } from "node:crypto";
import { allRows, firstRow, getDb } from "@/lib/db";
import type { StickerCategory } from "@/lib/catalog";

export interface UserDesign {
  id: string;
  userId: string;
  imageId: string;
  image: string;
  name: string;
  category: StickerCategory;
  createdAt: number;
}

interface UserDesignRow {
  id: string;
  user_id: string;
  image_id: string;
  name: string;
  category: string;
  created_at: number;
}

function mapDesign(row: UserDesignRow): UserDesign {
  const category: StickerCategory =
    row.category === "medium" || row.category === "large"
      ? row.category
      : "small";
  return {
    id: row.id,
    userId: row.user_id,
    imageId: row.image_id,
    image: `/api/images/${row.image_id}`,
    name: row.name,
    category,
    createdAt: row.created_at,
  };
}

export async function listUserDesigns(userId: string): Promise<UserDesign[]> {
  const client = await getDb();
  const result = await client.execute({
    sql: "SELECT * FROM user_designs WHERE user_id = ? ORDER BY created_at DESC",
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
    sql: `INSERT INTO user_designs (id, user_id, image_id, name, category, created_at)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [id, userId, imageId, name, category, now],
  });
  return {
    id,
    userId,
    imageId,
    image: `/api/images/${imageId}`,
    name,
    category,
    createdAt: now,
  };
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
    sql: "SELECT COUNT(*) AS count FROM user_designs WHERE user_id = ?",
    args: [userId],
  });
  const row = firstRow<{ count: number }>(result);
  return Number(row?.count ?? 0);
}
