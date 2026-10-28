import { randomUUID } from "node:crypto";
import { allRows, firstRow, getDb } from "@/lib/db";
import type {
  AdminProduct,
  BadgeKey,
  ProductCategory,
} from "@/lib/types";
import type {
  AdminProductCreateInput,
  AdminProductUpdateInput,
} from "@/lib/validation";

interface AdminProductRow {
  slug: string;
  name_en: string;
  name_ta: string;
  desc_en: string;
  desc_ta: string;
  price: number;
  image: string;
  color_en: string;
  color_ta: string;
  color_hex: string;
  category: string;
  badge: string | null;
  featured: number;
  sort_order: number;
  stock: number;
  active: number;
  updated_at: number;
}

function mapAdminProduct(row: AdminProductRow): AdminProduct {
  return {
    slug: row.slug,
    nameEn: row.name_en,
    nameTa: row.name_ta,
    descEn: row.desc_en,
    descTa: row.desc_ta,
    price: row.price,
    image: row.image,
    colorEn: row.color_en,
    colorTa: row.color_ta,
    colorHex: row.color_hex,
    category: row.category as ProductCategory,
    badge: (row.badge as BadgeKey | null) ?? null,
    featured: row.featured === 1,
    sortOrder: row.sort_order,
    stock: row.stock,
    active: row.active === 1,
    updatedAt: row.updated_at,
  };
}

export async function listAdminProducts(): Promise<AdminProduct[]> {
  const client = await getDb();
  const result = await client.execute(
    "SELECT * FROM products ORDER BY active DESC, sort_order ASC, updated_at DESC",
  );
  return allRows<AdminProductRow>(result).map(mapAdminProduct);
}

export async function getAdminProduct(
  slug: string,
): Promise<AdminProduct | null> {
  const client = await getDb();
  const result = await client.execute({
    sql: "SELECT * FROM products WHERE slug = ?",
    args: [slug],
  });
  const row = firstRow<AdminProductRow>(result);
  return row ? mapAdminProduct(row) : null;
}

export class AdminProductError extends Error {
  code: string;
  status: number;

  constructor(code: string, status = 400) {
    super(code);
    this.name = "AdminProductError";
    this.code = code;
    this.status = status;
  }
}

function isUniqueViolation(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const code = (error as { code?: string }).code;
  return (
    code === "SQLITE_CONSTRAINT_UNIQUE" ||
    /unique constraint failed/i.test(error.message)
  );
}

export async function createAdminProduct(
  input: AdminProductCreateInput,
): Promise<AdminProduct> {
  const client = await getDb();
  const now = Date.now();
  try {
    await client.execute({
      sql: `INSERT INTO products (
        slug, name_en, name_ta, desc_en, desc_ta, price, image,
        color_en, color_ta, color_hex, category, badge, featured,
        sort_order, stock, active, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        input.slug,
        input.nameEn,
        input.nameTa,
        input.descEn,
        input.descTa,
        input.price,
        input.image,
        input.colorEn,
        input.colorTa,
        input.colorHex,
        input.category,
        input.badge ?? null,
        input.featured ? 1 : 0,
        input.sortOrder,
        input.stock,
        input.active ? 1 : 0,
        now,
      ],
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AdminProductError("SLUG_TAKEN", 409);
    }
    throw error;
  }

  const created = await getAdminProduct(input.slug);
  if (!created) throw new Error("Product was created but could not be loaded");
  return created;
}

export async function updateAdminProduct(
  slug: string,
  input: AdminProductUpdateInput,
): Promise<AdminProduct | null> {
  const client = await getDb();
  const result = await client.execute({
    sql: `UPDATE products SET
      name_en = ?, name_ta = ?,
      desc_en = ?, desc_ta = ?,
      price = ?, image = ?,
      color_en = ?, color_ta = ?, color_hex = ?,
      category = ?, badge = ?,
      featured = ?, active = ?,
      stock = ?, sort_order = ?, updated_at = ?
      WHERE slug = ?`,
    args: [
      input.nameEn,
      input.nameTa,
      input.descEn,
      input.descTa,
      input.price,
      input.image,
      input.colorEn,
      input.colorTa,
      input.colorHex,
      input.category,
      input.badge ?? null,
      input.featured ? 1 : 0,
      input.active ? 1 : 0,
      input.stock,
      input.sortOrder,
      Date.now(),
      slug,
    ],
  });
  if (result.rowsAffected === 0) return null;
  return getAdminProduct(slug);
}

export interface AdminStats {
  totalOrders: number;
  openOrders: number;
  ordersLast24h: number;
  deliveredRevenue: number;
  activeProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
}

export async function getAdminStats(): Promise<AdminStats> {
  const client = await getDb();
  const result = await client.execute({
    sql: `SELECT
      (SELECT COUNT(*) FROM orders) AS totalOrders,
      (SELECT COUNT(*) FROM orders
        WHERE status IN ('placed', 'processing', 'shipped')) AS openOrders,
      (SELECT COUNT(*) FROM orders WHERE created_at >= ?) AS ordersLast24h,
      (SELECT COALESCE(SUM(total), 0) FROM orders
        WHERE status = 'delivered') AS deliveredRevenue,
      (SELECT COUNT(*) FROM products WHERE active = 1) AS activeProducts,
      (SELECT COALESCE(SUM(CASE WHEN stock <= 5 THEN 1 ELSE 0 END), 0)
        FROM products WHERE active = 1) AS lowStockProducts,
      (SELECT COALESCE(SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END), 0)
        FROM products WHERE active = 1) AS outOfStockProducts`,
    args: [Date.now() - 24 * 60 * 60 * 1000],
  });

  const row = firstRow<AdminStats>(result);
  return {
    totalOrders: Number(row?.totalOrders ?? 0),
    openOrders: Number(row?.openOrders ?? 0),
    ordersLast24h: Number(row?.ordersLast24h ?? 0),
    deliveredRevenue: Number(row?.deliveredRevenue ?? 0),
    activeProducts: Number(row?.activeProducts ?? 0),
    lowStockProducts: Number(row?.lowStockProducts ?? 0),
    outOfStockProducts: Number(row?.outOfStockProducts ?? 0),
  };
}

export async function getLowStockProducts(
  limit = 6,
): Promise<AdminProduct[]> {
  const client = await getDb();
  const result = await client.execute({
    sql: `SELECT * FROM products
          WHERE active = 1 AND stock <= 5
          ORDER BY stock ASC, sort_order ASC
          LIMIT ?`,
    args: [limit],
  });
  return allRows<AdminProductRow>(result).map(mapAdminProduct);
}

export async function saveProductImage(
  bytes: Buffer,
  mime: string,
  kind = "product",
): Promise<string> {
  const client = await getDb();
  const id = randomUUID();
  await client.execute({
    sql: `INSERT INTO product_images (id, mime, bytes, created_at, kind)
          VALUES (?, ?, ?, ?, ?)`,
    args: [id, mime, bytes, Date.now(), kind],
  });
  return id;
}

export async function getProductImage(
  id: string,
): Promise<{ mime: string; bytes: Buffer } | null> {
  const client = await getDb();
  const result = await client.execute({
    sql: "SELECT mime, bytes FROM product_images WHERE id = ?",
    args: [id],
  });
  const row = firstRow<{ mime: string; bytes: ArrayBuffer | Uint8Array }>(
    result,
  );
  if (!row) return null;
  const bytes =
    row.bytes instanceof ArrayBuffer
      ? Buffer.from(row.bytes)
      : Buffer.from(row.bytes);
  return { mime: row.mime, bytes };
}

export async function getImageKind(id: string): Promise<string | null> {
  const client = await getDb();
  const result = await client.execute({
    sql: "SELECT kind FROM product_images WHERE id = ?",
    args: [id],
  });
  const row = firstRow<{ kind: string | null }>(result);
  return row?.kind ?? null;
}
