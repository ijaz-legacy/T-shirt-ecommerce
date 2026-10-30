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
  /** "builtin:<stickerId>", "/api/images/<imageId>", or "text:<uuid>" */
  ref: string;
  /** Center X as % of canvas container, 0–100. */
  x: number;
  /** Center Y as % of canvas container, 0–100. */
  y: number;
  /**
   * Width of the element as % of canvas container (8–75).
   * This is the authoritative sizing; MIN/MAX are enforced in TeeCanvas.
   */
  scale: number;
  /** Rotation in degrees (-180 to +180). */
  rotation: number;
  /** Which side of the shirt this sticker is placed on: "front" (default) or "back". */
  face?: "front" | "back";
  /** Visual overrides set by the customer in the editor panel. Client-side only. */
  style?: {
    /** Background shape for stickers. "none" = original sticker bg, "transparent" = no bg for images. */
    bgShape: "none" | "transparent" | "circle" | "rounded" | "square";
    bgColor: string;
    /** Sticker theme overrides (built-in SVG stickers only) */
    fg?: string;
    accent?: string;
    /** Cropped region of the sticker, normalized 0–1 of the placement box.
     *  x/y = top-left corner, w/h = width/height. Cropping hides the rest. */
    crop?: { x: number; y: number; w: number; h: number };
  };
  /** Text content — only present when ref starts with "text:" */
  text?: {
    content: string;
    fontFamily: "sans" | "serif" | "display" | "mono";
    color: string;
    bold: boolean;
    italic: boolean;
  };
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
