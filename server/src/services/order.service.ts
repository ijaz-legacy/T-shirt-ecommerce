import { badRequest, forbidden, notFound, unavailable } from '../lib/http.js'
import { db, supabaseAdmin } from '../lib/supabase.js'
import type { AuthUser, CreateOrderInput } from '../types/index.js'

const ORDERS = 'orders'
const ITEMS = 'order_items'
const EVENTS = 'order_status_events'

export const FREE_SHIPPING_THRESHOLD = 999
export const SHIPPING_FEE = 49
export const ORDER_STATUSES = [
  'placed',
  'confirmed',
  'packed',
  'shipped',
  'delivered',
  'cancelled',
] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]

export function shippingFor(subtotal: number): number {
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE
}

/** IJZ-YYMMDD-NNNN — same format the checkout page uses. */
function nextOrderNumber(): string {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, '')
  const random = Math.floor(Math.random() * 9000 + 1000)
  return `IJZ-${date}-${random}`
}

const FIT_PRICES: Record<string, number> = { regular: 649, oversized: 699 }
const PRINT_PRICE_SMALL = 49
const PRINT_PRICE_MEDIUM = 79
const PRINT_PRICE_LARGE = 119

/** Mirrors client/src/lib/catalog.ts — prices are always computed here. */
function customUnitPrice(config: { fit?: unknown; placements?: unknown }): number {
  const base = FIT_PRICES[String(config.fit ?? '')]
  if (!base) throw badRequest('That custom tee is missing a valid fit.')

  const placements = Array.isArray(config.placements) ? config.placements : []
  if (placements.length === 0) {
    throw badRequest('A custom tee needs at least one sticker, image or text.')
  }

  return placements.reduce((sum, raw) => {
    const scale = Number((raw as { scale?: unknown })?.scale ?? 0)
    let price = PRINT_PRICE_LARGE
    if (scale > 1) {
      if (scale <= 27) price = PRINT_PRICE_SMALL
      else if (scale <= 48) price = PRINT_PRICE_MEDIUM
      else price = PRINT_PRICE_LARGE
    } else {
      if (scale <= 0.35) price = PRINT_PRICE_SMALL
      else if (scale <= 0.65) price = PRINT_PRICE_MEDIUM
      else price = PRINT_PRICE_LARGE
    }
    return sum + price
  }, base)
}

/**
 * Never trust a price the browser sends. Printed items take the stored product
 * price; custom tees are re-priced from their fit and placement scales.
 */
async function priceItems(input: CreateOrderInput): Promise<CreateOrderInput['items']> {
  const printedSlugs = [
    ...new Set(
      input.items
        .filter(item => item.kind === 'printed' && item.productSlug)
        .map(item => item.productSlug as string),
    ),
  ]

  const prices = new Map<string, number>()
  if (printedSlugs.length > 0) {
    const { data, error } = await db()
      .from('products')
      .select('slug, price, active')
      .in('slug', printedSlugs)
    if (error) throw new Error(error.message)
    for (const row of (data ?? []) as { slug: string; price: number; active: boolean }[]) {
      if (row.active) prices.set(row.slug, Number(row.price))
    }
  }

  return input.items.map(item => {
    if (item.kind === 'printed') {
      const price = item.productSlug ? prices.get(item.productSlug) : undefined
      if (price === undefined) {
        throw badRequest(`One of the items in your bag is no longer available (${item.nameEn}).`)
      }
      return { ...item, unitPrice: price }
    }
    const config = (item.customConfig ?? {}) as { fit?: unknown; placements?: unknown }
    return { ...item, unitPrice: customUnitPrice(config) }
  })
}

export async function createOrder(userId: string, input: CreateOrderInput) {
  if (input.items.length === 0) throw badRequest('An order needs at least one item.')

  const priced = await priceItems(input)

  const items = priced.map(item => ({
    kind: item.kind,
    product_slug: item.productSlug ?? null,
    name_en: item.nameEn,
    name_ta: item.nameTa,
    size: item.size,
    color_en: item.colorEn,
    color_ta: item.colorTa,
    image: item.image ?? null,
    custom_config: item.customConfig == null ? null : JSON.stringify(item.customConfig),
    quantity: item.quantity,
    unit_price: item.unitPrice,
  }))

  const subtotal = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0)
  const shipping = shippingFor(subtotal)
  const total = subtotal + shipping

  const { data: order, error: orderError } = await db()
    .from(ORDERS)
    .insert({
      order_number: nextOrderNumber(),
      user_id: userId,
      status: 'placed',
      customer_name: input.customer.name,
      phone: input.customer.phone,
      address1: input.customer.address1,
      address2: input.customer.address2 ?? '',
      city: input.customer.city,
      state: input.customer.state,
      pincode: input.customer.pincode,
      subtotal,
      shipping_fee: shipping,
      total,
      payment_method: input.paymentMethod,
    })
    .select('*')
    .single()

  if (orderError) throw new Error(orderError.message)

  const { error: itemsError } = await db()
    .from(ITEMS)
    .insert(items.map(item => ({ ...item, order_id: order.id })))

  if (itemsError) throw new Error(itemsError.message)

  await db().from(EVENTS).insert({
    order_id: order.id,
    user_id: userId,
    status: 'placed',
    note: 'Order placed',
  })

  return { order, items }
}

export async function listOrders(user: AuthUser) {
  let query = db().from(ORDERS).select('*').order('created_at', { ascending: false })
  if (user.role === 'customer') query = query.eq('user_id', user.id)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

/** Loads an order by uuid or order number and checks the caller may see it. */
export async function getOrder(user: AuthUser, idOrNumber: string) {
  const column = /^[0-9a-f-]{36}$/i.test(idOrNumber) ? 'id' : 'order_number'
  const { data, error } = await db().from(ORDERS).select('*').eq(column, idOrNumber).maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw notFound('Order not found.')

  const order = data as Record<string, unknown>
  if (user.role === 'customer' && order.user_id !== user.id) {
    throw forbidden('This order belongs to another account.')
  }

  const { data: items } = await db().from(ITEMS).select('*').eq('order_id', order.id)
  const { data: events } = await db()
    .from(EVENTS)
    .select('*')
    .eq('order_id', order.id)
    .order('created_at', { ascending: true })

  return { order, items: items ?? [], events: events ?? [] }
}

/** Exactly what public.track_order() exposes — nothing about the customer. */
export interface TrackedOrder {
  id: string
  order_number: string
  status: string
  created_at: string
  total: number
}

/**
 * Public order lookup. Runs with the service-role client on purpose: the RPC is
 * granted to service_role only, so a browser holding the public anon key has no
 * way to reach public.orders or this function at all. Throttling lives in the
 * route, not here.
 */
export async function trackOrder(orderNumber: string): Promise<TrackedOrder | null> {
  if (!supabaseAdmin) {
    throw unavailable('Order tracking is not configured on this server yet.')
  }

  const { data, error } = await supabaseAdmin.rpc('track_order', {
    p_order_number: orderNumber.trim().toUpperCase(),
  })

  if (error) {
    // 42883 = undefined_function, PGRST202 = RPC not in the schema cache: the
    // security migration has not been applied to this database yet.
    if (error.code === '42883' || error.code === 'PGRST202') {
      throw unavailable('Order tracking is not ready yet. Please contact us on WhatsApp.')
    }
    throw new Error(error.message)
  }

  const rows = (Array.isArray(data) ? data : data ? [data] : []) as TrackedOrder[]
  const row = rows[0]
  if (!row) return null

  return {
    id: row.id,
    order_number: row.order_number,
    status: row.status,
    created_at: row.created_at,
    total: Number(row.total),
  }
}

export async function updateOrderStatus(id: string, status: OrderStatus, note?: string) {
  const { data, error } = await db()
    .from(ORDERS)
    .update({ status })
    .eq('id', id)
    .select('*')
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) throw notFound('Order not found.')

  await db().from(EVENTS).insert({
    order_id: id,
    user_id: (data as { user_id: string | null }).user_id,
    status,
    note: note ?? `Status changed to ${status}`,
  })

  return data
}
