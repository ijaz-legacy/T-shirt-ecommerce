/** The authenticated caller attached to `req.user`. */
export interface AuthUser {
  id: string
  email: string | null
  role: 'owner' | 'staff' | 'customer'
}

export interface Product {
  id: string
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
  created_at?: string
  updated_at?: string
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

export interface OrderItemInput {
  kind: 'printed' | 'custom'
  productSlug?: string | null
  nameEn: string
  nameTa: string
  size: string
  colorEn: string
  colorTa: string
  image?: string | null
  customConfig?: unknown
  quantity: number
  unitPrice: number
}

export interface CreateOrderInput {
  customer: {
    name: string
    phone: string
    address1: string
    address2?: string
    city: string
    state: string
    pincode: string
  }
  paymentMethod: 'cod' | 'online'
  items: OrderItemInput[]
}
