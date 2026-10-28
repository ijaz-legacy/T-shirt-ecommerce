import type { FitId, Size, StickerId, TeeColorId } from "@/lib/catalog";

export type Lang = "en" | "ta";

export type ProductCategory = "nature" | "retro" | "abstract" | "street";
export type BadgeKey = "bestseller" | "new" | "limited";

export interface Product {
  slug: string;
  nameEn: string;
  nameTa: string;
  descEn: string;
  descTa: string;
  price: number;
  image: string;
  colorEn: string;
  colorTa: string;
  colorHex: string;
  category: ProductCategory;
  badge: BadgeKey | null;
  featured: boolean;
  sortOrder: number;
  stock: number;
}

export interface AdminProduct extends Product {
  active: boolean;
  updatedAt: number;
}

export interface StickerPlacement {
  /** "builtin:<stickerId>" or "/api/images/<imageId>" */
  ref: string;
  /** Percent position on the tee canvas, 0–100. */
  x: number;
  y: number;
  /** Size multiplier between MIN_SCALE and MAX_SCALE. */
  scale: number;
  /** Degrees between MIN_ROTATION and MAX_ROTATION. */
  rotation: number;
}

export interface CustomConfig {
  fit: FitId;
  size: Size;
  colorId: TeeColorId;
  placements: StickerPlacement[];
}

export type UserRole = "customer" | "admin";

export interface UserPublic {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface Address {
  fullName: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  pincode: string;
}

export type OrderStatus = "placed" | "processing" | "shipped" | "delivered" | "cancelled";

export interface OrderEvent {
  id: string;
  status: OrderStatus;
  note: string | null;
  createdAt: number;
}

export interface OrderItem {
  id: string;
  kind: "printed" | "custom";
  productSlug: string | null;
  nameEn: string;
  nameTa: string;
  size: Size;
  colorEn: string;
  colorTa: string;
  image: string | null;
  custom: CustomConfig | null;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  customerName: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  pincode: string;
  subtotal: number;
  shippingFee: number;
  total: number;
  paymentMethod: "cod";
  createdAt: number;
  items: OrderItem[];
}
