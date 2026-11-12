import type { FitId, Size, TeeColorId } from './catalog'

export type Lang = 'en' | 'ta'

export interface StickerPlacement {
  /** Stable identity so a 3D decal survives reordering/removal. */
  id?: string
  ref: string
  x: number
  y: number
  scale: number
  rotation: number
  /**
   * Where this sticker sits on the real garment. `point` is on the surface and
   * `normal` points out of it, both in the 3D viewer's world space. Missing for
   * designs made in the flat editor — the viewer then projects x/y onto the
   * side of the shirt this placement belongs to.
   */
  decal?: { point: [number, number, number]; normal: [number, number, number] }
  /** Which face of the garment this placement is printed on (default front). */
  side?: 'front' | 'back'
  /** Image crop/zoom — offset and zoom within the sticker frame (like Word/PPT). */
  crop?: {
    /** Horizontal offset, -1…1 (0 = centred). */
    offsetX: number
    /** Vertical offset, -1…1 (0 = centred). */
    offsetY: number
    /** Zoom level, 1 = fit, >1 = zoomed in. */
    zoom: number
  }
  style?: {
    bgShape: 'none' | 'transparent' | 'circle' | 'rounded' | 'square'
    bgColor: string
    fg?: string
    accent?: string
  }
  text?: {
    content: string
    fontFamily: 'sans' | 'serif' | 'display' | 'mono'
    color: string
    bold: boolean
    italic: boolean
  }
}

export interface CustomConfig {
  fit: FitId
  size: Size
  colorId: TeeColorId
  placements: StickerPlacement[]
}

export interface CartItem {
  key: string
  kind: 'printed' | 'custom'
  // printed
  slug?: string
  nameEn: string
  nameTa: string
  size: Size
  colorEn: string
  colorTa: string
  colorHex: string
  image?: string
  unitPrice: number
  qty: number
  // custom
  fit?: FitId
  colorId?: TeeColorId
  placements?: StickerPlacement[]
}

export interface Product {
  slug: string
  name_en: string
  name_ta: string
  desc_en: string
  desc_ta: string
  price: number
  image: string
  color_en: string
  color_ta: string
  color_hex: string
  category: string
  badge: string | null
  featured: boolean
  sort_order: number
  stock: number
  active: boolean
}

export interface Sticker {
  id: string
  name_en: string
  name_ta: string
  image_url: string
  category: string
  active: boolean
  sort_order: number
}

export interface Order {
  id: string
  order_number: string
  status: string
  customer_name: string
  phone: string
  address1: string
  address2: string
  city: string
  state: string
  pincode: string
  subtotal: number
  shipping_fee: number
  total: number
  payment_method: string
  created_at: number
}

export interface OrderItem {
  id: string
  order_id: string
  kind: string
  product_slug: string | null
  name_en: string
  name_ta: string
  size: string
  color_en: string
  color_ta: string
  image: string | null
  custom_config: string | null
  quantity: number
  unit_price: number
}
