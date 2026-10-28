import { randomBytes, randomUUID } from "node:crypto";
import type {
  InStatement,
  ResultSet,
} from "@libsql/client";
import { allRows, firstRow, getDb } from "@/lib/db";
import {
  MAX_PLACEMENTS,
  MAX_ROTATION,
  MAX_SCALE,
  MIN_ROTATION,
  MIN_SCALE,
  calcCustomUnitPrice,
  calcTotals,
  getFit,
  getTeeColor,
  isFitId,
  isSize,
  isTeeColorId,
  parsePlacementRef,
} from "@/lib/catalog";
import type { OrderInput } from "@/lib/validation";
import type {
  CustomConfig,
  Order,
  OrderEvent,
  OrderItem,
  OrderStatus,
  StickerPlacement,
  UserPublic,
} from "@/lib/types";

export const ORDER_STATUSES: readonly OrderStatus[] = [
  "placed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

export const ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  placed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

export function isOrderStatus(value: unknown): value is OrderStatus {
  return (
    typeof value === "string" &&
    (ORDER_STATUSES as readonly string[]).includes(value)
  );
}

export class OrderError extends Error {
  code: string;
  status: number;

  constructor(code: string, status = 400) {
    super(code);
    this.name = "OrderError";
    this.code = code;
    this.status = status;
  }
}

interface OrderRow {
  id: string;
  order_number: string;
  status: string;
  customer_name: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  pincode: string;
  subtotal: number;
  shipping_fee: number;
  total: number;
  payment_method: string;
  created_at: number;
}

interface OrderItemRow {
  id: string;
  order_id: string;
  kind: "printed" | "custom";
  product_slug: string | null;
  name_en: string;
  name_ta: string;
  size: string;
  color_en: string;
  color_ta: string;
  image: string | null;
  custom_config: string | null;
  quantity: number;
  unit_price: number;
}

interface ProductSnapshotRow {
  slug: string;
  name_en: string;
  name_ta: string;
  price: number;
  image: string;
  color_en: string;
  color_ta: string;
  stock: number;
}

interface OrderEventRow {
  id: string;
  status: string;
  note: string | null;
  created_at: number;
}

interface SqlExecutor {
  execute(statement: InStatement): Promise<ResultSet>;
}

function isPlacement(value: unknown): value is StickerPlacement {
  if (!value || typeof value !== "object") return false;
  const placement = value as Record<string, unknown>;
  return (
    typeof placement.ref === "string" &&
    parsePlacementRef(placement.ref) !== null &&
    typeof placement.x === "number" &&
    placement.x >= 0 &&
    placement.x <= 100 &&
    typeof placement.y === "number" &&
    placement.y >= 0 &&
    placement.y <= 100 &&
    typeof placement.scale === "number" &&
    placement.scale >= 0.01 &&
    placement.scale <= 100 &&
    typeof placement.rotation === "number" &&
    placement.rotation >= -360 &&
    placement.rotation <= 360 &&
    (placement.face === undefined || placement.face === "front" || placement.face === "back")
  );
}

function parseCustomConfig(value: string | null): CustomConfig | null {
  if (!value) return null;
  try {
    const data = JSON.parse(value) as Record<string, unknown>;
    if (
      !isFitId(data.fit) ||
      !isSize(data.size) ||
      !isTeeColorId(data.colorId) ||
      !Array.isArray(data.placements) ||
      data.placements.length < 1 ||
      data.placements.length > MAX_PLACEMENTS ||
      !data.placements.every(isPlacement)
    ) {
      return null;
    }
    return {
      fit: data.fit,
      size: data.size,
      colorId: data.colorId,
      placements: data.placements,
    };
  } catch {
    return null;
  }
}

function mapOrderItem(row: OrderItemRow): OrderItem {
  if (!isSize(row.size)) {
    throw new Error(`Invalid size stored on order item ${row.id}`);
  }
  return {
    id: row.id,
    kind: row.kind,
    productSlug: row.product_slug,
    nameEn: row.name_en,
    nameTa: row.name_ta,
    size: row.size,
    colorEn: row.color_en,
    colorTa: row.color_ta,
    image: row.image,
    custom: parseCustomConfig(row.custom_config),
    quantity: row.quantity,
    unitPrice: row.unit_price,
  };
}

function mapOrder(row: OrderRow, items: OrderItem[]): Order {
  return {
    id: row.id,
    orderNumber: row.order_number,
    status: row.status as OrderStatus,
    customerName: row.customer_name,
    phone: row.phone,
    address1: row.address1,
    address2: row.address2,
    city: row.city,
    state: row.state,
    pincode: row.pincode,
    subtotal: row.subtotal,
    shippingFee: row.shipping_fee,
    total: row.total,
    paymentMethod: "cod",
    createdAt: row.created_at,
    items,
  };
}

async function itemsByOrder(
  orderIds: string[],
): Promise<Map<string, OrderItem[]>> {
  const map = new Map<string, OrderItem[]>();
  if (orderIds.length === 0) return map;
  const placeholders = orderIds.map(() => "?").join(", ");
  const client = await getDb();
  const result = await client.execute({
    sql: `SELECT * FROM order_items
          WHERE order_id IN (${placeholders})
          ORDER BY rowid ASC`,
    args: orderIds,
  });
  for (const row of allRows<OrderItemRow>(result)) {
    const list = map.get(row.order_id) ?? [];
    list.push(mapOrderItem(row));
    map.set(row.order_id, list);
  }
  return map;
}

export async function getOrdersForUser(userId: string): Promise<Order[]> {
  const client = await getDb();
  const result = await client.execute({
    sql: "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC",
    args: [userId],
  });
  const rows = allRows<OrderRow>(result);
  const items = await itemsByOrder(rows.map((row) => row.id));
  return rows.map((row) => mapOrder(row, items.get(row.id) ?? []));
}

export async function getOrderForUser(
  orderId: string,
  userId: string,
): Promise<Order | null> {
  const client = await getDb();
  const result = await client.execute({
    sql: "SELECT * FROM orders WHERE id = ? AND user_id = ?",
    args: [orderId, userId],
  });
  const row = firstRow<OrderRow>(result);
  if (!row) return null;
  const items = await itemsByOrder([row.id]);
  return mapOrder(row, items.get(row.id) ?? []);
}

export async function getOrderForUserByNumber(
  orderNumber: string,
  userId: string,
): Promise<Order | null> {
  const client = await getDb();
  const result = await client.execute({
    sql: "SELECT * FROM orders WHERE order_number = ? AND user_id = ?",
    args: [orderNumber, userId],
  });
  const row = firstRow<OrderRow>(result);
  if (!row) return null;
  const items = await itemsByOrder([row.id]);
  return mapOrder(row, items.get(row.id) ?? []);
}

export async function getOrderEvents(
  orderId: string,
): Promise<OrderEvent[]> {
  const client = await getDb();
  const result = await client.execute({
    sql: `SELECT id, status, note, created_at
          FROM order_status_events
          WHERE order_id = ?
          ORDER BY created_at ASC, rowid ASC`,
    args: [orderId],
  });
  return allRows<OrderEventRow>(result).flatMap((row) =>
    isOrderStatus(row.status)
      ? [
          {
            id: row.id,
            status: row.status,
            note: row.note,
            createdAt: row.created_at,
          },
        ]
      : [],
  );
}

export async function getOrderForAdmin(
  orderId: string,
): Promise<Order | null> {
  const client = await getDb();
  const result = await client.execute({
    sql: "SELECT * FROM orders WHERE id = ?",
    args: [orderId],
  });
  const row = firstRow<OrderRow>(result);
  if (!row) return null;
  const items = await itemsByOrder([row.id]);
  return mapOrder(row, items.get(row.id) ?? []);
}

export interface AdminOrderPage {
  orders: Order[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}

export async function getOrdersForAdmin(
  status: OrderStatus | "all",
  requestedPage = 1,
  pageSize = 20,
): Promise<AdminOrderPage> {
  const client = await getDb();
  const where = status === "all" ? "" : "WHERE status = ?";
  const filterArgs: string[] = status === "all" ? [] : [status];

  const totalResult = await client.execute({
    sql: `SELECT COUNT(*) AS count FROM orders ${where}`,
    args: filterArgs,
  });
  const total = Number(firstRow<{ count: number }>(totalResult)?.count ?? 0);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, Math.floor(requestedPage)), pages);

  const rowsResult = await client.execute({
    sql: `SELECT * FROM orders ${where}
          ORDER BY created_at DESC
          LIMIT ? OFFSET ?`,
    args: [...filterArgs, pageSize, (page - 1) * pageSize],
  });
  const rows = allRows<OrderRow>(rowsResult);
  const items = await itemsByOrder(rows.map((row) => row.id));

  return {
    orders: rows.map((row) => mapOrder(row, items.get(row.id) ?? [])),
    total,
    page,
    pageSize,
    pages,
  };
}

export async function updateOrderStatus(
  orderId: string,
  nextStatus: OrderStatus,
  note: string | null,
): Promise<Order> {
  const client = await getDb();
  const currentResult = await client.execute({
    sql: "SELECT status FROM orders WHERE id = ?",
    args: [orderId],
  });
  const current = firstRow<{ status: string }>(currentResult);
  if (!current || !isOrderStatus(current.status)) {
    throw new OrderError("ORDER_NOT_FOUND", 404);
  }
  if (!ALLOWED_TRANSITIONS[current.status].includes(nextStatus)) {
    throw new OrderError("INVALID_STATUS_TRANSITION", 409);
  }

  const transaction = await client.transaction("write");
  try {
    const update = await transaction.execute({
      sql: "UPDATE orders SET status = ? WHERE id = ? AND status = ?",
      args: [nextStatus, orderId, current.status],
    });
    if (update.rowsAffected !== 1) {
      throw new OrderError("INVALID_STATUS_TRANSITION", 409);
    }

    await transaction.execute({
      sql: `INSERT INTO order_status_events
            (id, order_id, status, note, created_at)
            VALUES (?, ?, ?, ?, ?)`,
      args: [randomUUID(), orderId, nextStatus, note, Date.now()],
    });

    if (nextStatus === "cancelled") {
      const printed = await transaction.execute({
        sql: `SELECT product_slug AS slug, quantity
              FROM order_items WHERE order_id = ? AND kind = 'printed'`,
        args: [orderId],
      });
      for (const item of allRows<{ slug: string | null; quantity: number }>(
        printed,
      )) {
        if (item.slug) {
          await transaction.execute({
            sql: "UPDATE products SET stock = stock + ? WHERE slug = ?",
            args: [item.quantity, item.slug],
          });
        }
      }
    }

    await transaction.commit();
  } finally {
    transaction.close();
  }

  const updated = await getOrderForAdmin(orderId);
  if (!updated) throw new Error("Order status updated but could not be loaded");
  return updated;
}

async function generateOrderNumber(executor: SqlExecutor): Promise<string> {
  const now = new Date();
  const yy = String(now.getUTCFullYear()).slice(-2);
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const prefix = `IJ-${yy}${mm}${dd}-`;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const suffix = randomBytes(3).toString("hex").toUpperCase();
    const candidate = `${prefix}${suffix}`;
    const existing = await executor.execute({
      sql: "SELECT 1 FROM orders WHERE order_number = ?",
      args: [candidate],
    });
    if (existing.rows.length === 0) return candidate;
  }
  throw new Error("Unable to generate a unique order number");
}

interface PendingItem {
  id: string;
  kind: "printed" | "custom";
  productSlug: string | null;
  nameEn: string;
  nameTa: string;
  size: string;
  colorEn: string;
  colorTa: string;
  image: string | null;
  customConfig: string | null;
  quantity: number;
  unitPrice: number;
}

export async function createOrder(
  user: UserPublic,
  input: OrderInput,
): Promise<Order> {
  const client = await getDb();

  const existing = await client.execute({
    sql: "SELECT id FROM orders WHERE user_id = ? AND idempotency_key = ?",
    args: [user.id, input.idempotencyKey],
  });
  const existingRow = firstRow<{ id: string }>(existing);
  if (existingRow) {
    const previous = await getOrderForUser(existingRow.id, user.id);
    if (previous) return previous;
  }

  const productCache = new Map<string, ProductSnapshotRow | null>();
  const pending: PendingItem[] = [];
  const stockNeeded = new Map<string, number>();
  let subtotal = 0;

  for (const line of input.items) {
    if (!Number.isInteger(line.quantity) || line.quantity < 1) {
      throw new OrderError("INVALID_QUANTITY");
    }

    if (line.kind === "printed") {
      let product = productCache.get(line.productId);
      if (product === undefined) {
        const result = await client.execute({
          sql: `SELECT slug, name_en, name_ta, price, image, color_en,
                       color_ta, stock
                FROM products WHERE slug = ? AND active = 1`,
          args: [line.productId],
        });
        product = firstRow<ProductSnapshotRow>(result) ?? null;
        productCache.set(line.productId, product);
      }
      if (!product) throw new OrderError("PRODUCT_UNAVAILABLE");

      const needed = (stockNeeded.get(product.slug) ?? 0) + line.quantity;
      if (needed > product.stock) {
        throw new OrderError("INSUFFICIENT_STOCK", 409);
      }
      stockNeeded.set(product.slug, needed);
      subtotal += product.price * line.quantity;
      pending.push({
        id: randomUUID(),
        kind: "printed",
        productSlug: product.slug,
        nameEn: product.name_en,
        nameTa: product.name_ta,
        size: line.size,
        colorEn: product.color_en,
        colorTa: product.color_ta,
        image: product.image,
        customConfig: null,
        quantity: line.quantity,
        unitPrice: product.price,
      });
      continue;
    }

    const placements = line.placements;
    if (
      placements.length < 1 ||
      placements.length > MAX_PLACEMENTS ||
      !placements.every((placement) => parsePlacementRef(placement.ref))
    ) {
      throw new OrderError("INVALID_CUSTOMIZATION");
    }

    const imageIds = placements
      .map((placement) => parsePlacementRef(placement.ref))
      .flatMap((ref) => (ref && ref.type === "image" ? [ref.id] : []));
    if (imageIds.length > 0) {
      const uniqueIds = [...new Set(imageIds)];
      const placeholders = uniqueIds.map(() => "?").join(", ");
      const images = await client.execute({
        sql: `SELECT id FROM product_images
              WHERE kind IN ('sticker', 'custom-upload') AND id IN (${placeholders})`,
        args: uniqueIds,
      });
      if (images.rows.length !== uniqueIds.length) {
        throw new OrderError("INVALID_CUSTOMIZATION");
      }
    }

    const fit = getFit(line.fit);
    const color = getTeeColor(line.colorId);
    const unitPrice = calcCustomUnitPrice(
      line.fit,
      placements.map((placement) => placement.scale),
    );
    subtotal += unitPrice * line.quantity;

    pending.push({
      id: randomUUID(),
      kind: "custom",
      productSlug: null,
      nameEn: `${fit.nameEn} custom tee`,
      nameTa: `${fit.nameTa} கஸ்டம் டீ`,
      size: line.size,
      colorEn: color.nameEn,
      colorTa: color.nameTa,
      image: null,
      customConfig: JSON.stringify({
        fit: line.fit,
        size: line.size,
        colorId: line.colorId,
        placements,
      }),
      quantity: line.quantity,
      unitPrice,
    });
  }

  if (pending.length === 0) throw new OrderError("EMPTY_CART");

  const { shippingFee, total } = calcTotals(subtotal);
  const orderId = randomUUID();
  const createdAt = Date.now();

  try {
    const transaction = await client.transaction("write");
    try {
      const orderNumber = await generateOrderNumber(transaction);

      await transaction.execute({
        sql: `INSERT INTO orders (
          id, order_number, user_id, status, customer_name, phone,
          address1, address2, city, state, pincode, subtotal, shipping_fee,
          total, payment_method, idempotency_key, created_at
        ) VALUES (?, ?, ?, 'placed', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'cod', ?, ?)`,
        args: [
          orderId,
          orderNumber,
          user.id,
          input.address.fullName,
          input.address.phone,
          input.address.address1,
          input.address.address2,
          input.address.city,
          input.address.state,
          input.address.pincode,
          subtotal,
          shippingFee,
          total,
          input.idempotencyKey,
          createdAt,
        ],
      });

      for (const item of pending) {
        await transaction.execute({
          sql: `INSERT INTO order_items (
            id, order_id, kind, product_slug, name_en, name_ta, size,
            color_en, color_ta, image, custom_config, quantity, unit_price
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            item.id,
            orderId,
            item.kind,
            item.productSlug,
            item.nameEn,
            item.nameTa,
            item.size,
            item.colorEn,
            item.colorTa,
            item.image,
            item.customConfig,
            item.quantity,
            item.unitPrice,
          ],
        });
      }

      for (const [slug, quantity] of stockNeeded) {
        const result = await transaction.execute({
          sql: `UPDATE products SET stock = stock - ?
                WHERE slug = ? AND active = 1 AND stock >= ?`,
          args: [quantity, slug, quantity],
        });
        if (result.rowsAffected !== 1) {
          throw new OrderError("INSUFFICIENT_STOCK", 409);
        }
      }

      await transaction.execute({
        sql: `INSERT INTO order_status_events
              (id, order_id, status, note, created_at)
              VALUES (?, ?, 'placed', NULL, ?)`,
        args: [randomUUID(), orderId, createdAt],
      });

      await transaction.commit();
    } finally {
      transaction.close();
    }
  } catch (error) {
    const raced = await client.execute({
      sql: "SELECT id FROM orders WHERE user_id = ? AND idempotency_key = ?",
      args: [user.id, input.idempotencyKey],
    });
    const racedRow = firstRow<{ id: string }>(raced);
    if (racedRow) {
      const previous = await getOrderForUser(racedRow.id, user.id);
      if (previous) return previous;
    }
    throw error;
  }

  const created = await getOrderForUser(orderId, user.id);
  if (!created) throw new Error("Order was created but could not be loaded");
  return created;
}
