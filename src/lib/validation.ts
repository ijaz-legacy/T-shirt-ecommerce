import { z } from "zod";
import {
  FIT_IDS,
  MAX_QTY,
  MAX_STICKERS,
  SIZES,
  STICKER_IDS,
  TEE_COLOR_IDS,
} from "@/lib/catalog";

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(60),
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  password: z
    .string()
    .min(8)
    .max(72)
    .regex(/[A-Za-z]/, "letter_required")
    .regex(/[0-9]/, "number_required"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  password: z.string().min(1).max(72),
});

export const addressSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/),
  address1: z.string().trim().min(5).max(160),
  address2: z.string().trim().max(160).optional().default(""),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  pincode: z
    .string()
    .trim()
    .regex(/^\d{6}$/),
});

const printedItemSchema = z.object({
  kind: z.literal("printed"),
  productId: z.string().min(1).max(100),
  size: z.enum(SIZES),
  quantity: z.number().int().min(1).max(MAX_QTY),
});

const customItemSchema = z.object({
  kind: z.literal("custom"),
  fit: z.enum(FIT_IDS),
  size: z.enum(SIZES),
  colorId: z.enum(TEE_COLOR_IDS),
  stickerIds: z.array(z.enum(STICKER_IDS)).min(1).max(MAX_STICKERS),
  quantity: z.number().int().min(1).max(MAX_QTY),
});

export const orderSchema = z.object({
  idempotencyKey: z.string().min(8).max(100).regex(/^[A-Za-z0-9_-]+$/),
  address: addressSchema,
  items: z
    .array(z.discriminatedUnion("kind", [printedItemSchema, customItemSchema]))
    .min(1)
    .max(20),
});

export const uuidSchema = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    "invalid_id",
  );

export const productSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(
    z
      .string()
      .min(2)
      .max(80)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  );

const imagePathSchema = z
  .string()
  .trim()
  .max(300)
  .refine(
    (value) =>
      value.startsWith("/images/products/") ||
      value.startsWith("/api/images/"),
    "invalid_image_path",
  );

const adminProductBaseSchema = z.object({
  nameEn: z.string().trim().min(2).max(80),
  nameTa: z.string().trim().min(2).max(120),
  descEn: z.string().trim().min(10).max(600),
  descTa: z.string().trim().min(5).max(900),
  price: z.number().int().min(99).max(99999),
  image: imagePathSchema,
  colorEn: z.string().trim().min(2).max(40),
  colorTa: z.string().trim().min(2).max(60),
  colorHex: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/),
  category: z.enum(["nature", "retro", "abstract", "street"]),
  badge: z.enum(["bestseller", "new", "limited"]).nullable(),
  featured: z.boolean(),
  active: z.boolean(),
  stock: z.number().int().min(0).max(9999),
  sortOrder: z.number().int().min(0).max(9999),
});

export const adminProductCreateSchema = adminProductBaseSchema.extend({
  slug: productSlugSchema,
});

export const adminProductUpdateSchema = adminProductBaseSchema;

export const orderStatusUpdateSchema = z.object({
  status: z.enum(["placed", "processing", "shipped", "delivered", "cancelled"]),
  note: z.string().trim().max(200).optional(),
});

export type AdminProductCreateInput = z.infer<typeof adminProductCreateSchema>;
export type AdminProductUpdateInput = z.infer<typeof adminProductUpdateSchema>;
export type OrderStatusUpdateInput = z.infer<typeof orderStatusUpdateSchema>;

export type OrderInput = z.infer<typeof orderSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
