import { randomUUID } from "node:crypto";
import { allRows, firstRow, getDb } from "@/lib/db";
import { saveProductImage } from "@/lib/admin";
import type { StickerCategory } from "@/lib/catalog";

export interface StickerRecord {
  id: string;
  nameEn: string;
  nameTa: string;
  imageId: string;
  image: string;
  category: StickerCategory;
  active: boolean;
  sortOrder: number;
  createdAt: number;
}

interface StickerRow {
  id: string;
  name_en: string;
  name_ta: string;
  image_id: string;
  category: string;
  active: number;
  sort_order: number;
  created_at: number;
}

function mapSticker(row: StickerRow): StickerRecord {
  const category: StickerCategory =
    row.category === "medium" || row.category === "large"
      ? row.category
      : "small";
  return {
    id: row.id,
    nameEn: row.name_en,
    nameTa: row.name_ta,
    imageId: row.image_id,
    image: `/api/images/${row.image_id}`,
    category,
    active: row.active === 1,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

export async function listStickers(includeInactive: boolean): Promise<StickerRecord[]> {
  const client = await getDb();
  const where = includeInactive ? "" : "WHERE active = 1";
  const result = await client.execute(
    `SELECT * FROM stickers ${where} ORDER BY sort_order ASC, created_at ASC`,
  );
  return allRows<StickerRow>(result).map(mapSticker);
}

export async function getStickerRecord(
  id: string,
): Promise<StickerRecord | null> {
  const client = await getDb();
  const result = await client.execute({
    sql: "SELECT * FROM stickers WHERE id = ?",
    args: [id],
  });
  const row = firstRow<StickerRow>(result);
  return row ? mapSticker(row) : null;
}

export interface StickerInput {
  nameEn: string;
  nameTa: string;
  active: boolean;
  sortOrder: number;
  category: StickerCategory;
}

export async function createSticker(
  input: StickerInput,
  imageBytes: Buffer,
  imageMime: string,
): Promise<StickerRecord> {
  const client = await getDb();
  const imageId = await saveProductImage(imageBytes, imageMime, "sticker");
  const id = randomUUID();
  await client.execute({
    sql: `INSERT INTO stickers (id, name_en, name_ta, image_id, category, active, sort_order, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      input.nameEn,
      input.nameTa,
      imageId,
      input.category,
      input.active ? 1 : 0,
      input.sortOrder,
      Date.now(),
    ],
  });
  const created = await getStickerRecord(id);
  if (!created) throw new Error("Sticker was created but could not be loaded");
  return created;
}

export async function updateSticker(
  id: string,
  input: StickerInput,
  imageBytes: Buffer | null,
  imageMime: string,
): Promise<StickerRecord | null> {
  const client = await getDb();
  const current = await getStickerRecord(id);
  if (!current) return null;

  let imageId = current.imageId;
  if (imageBytes) {
    imageId = await saveProductImage(imageBytes, imageMime, "sticker");
  }

  await client.execute({
    sql: `UPDATE stickers SET name_en = ?, name_ta = ?, image_id = ?,
          category = ?, active = ?, sort_order = ? WHERE id = ?`,
    args: [
      input.nameEn,
      input.nameTa,
      imageId,
      input.category,
      input.active ? 1 : 0,
      input.sortOrder,
      id,
    ],
  });
  return getStickerRecord(id);
}

export async function deleteSticker(id: string): Promise<boolean> {
  const client = await getDb();
  const current = await getStickerRecord(id);
  if (!current) return false;
  const transaction = await client.transaction("write");
  try {
    await transaction.execute({
      sql: "DELETE FROM stickers WHERE id = ?",
      args: [id],
    });
    await transaction.execute({
      sql: "DELETE FROM product_images WHERE id = ?",
      args: [current.imageId],
    });
    await transaction.commit();
  } finally {
    transaction.close();
  }
  return true;
}
