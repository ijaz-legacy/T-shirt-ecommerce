import { allRows, firstRow, getDb } from "@/lib/db";
import type { BadgeKey, Product, ProductCategory } from "@/lib/types";

interface ProductRow {
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
}

function mapProduct(row: ProductRow): Product {
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
  };
}

export async function getAllProducts(): Promise<Product[]> {
  const client = await getDb();
  const result = await client.execute(
    "SELECT * FROM products WHERE active = 1 ORDER BY sort_order ASC",
  );
  return allRows<ProductRow>(result).map(mapProduct);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const client = await getDb();
  const result = await client.execute({
    sql: "SELECT * FROM products WHERE slug = ? AND active = 1",
    args: [slug],
  });
  const row = firstRow<ProductRow>(result);
  return row ? mapProduct(row) : null;
}

export async function getFeaturedProducts(limit = 4): Promise<Product[]> {
  const client = await getDb();
  const result = await client.execute({
    sql: `SELECT * FROM products
          WHERE featured = 1 AND active = 1
          ORDER BY sort_order ASC
          LIMIT ?`,
    args: [limit],
  });
  return allRows<ProductRow>(result).map(mapProduct);
}
