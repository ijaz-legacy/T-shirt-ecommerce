import type { Request, Response } from 'express'
import { z } from 'zod'
import { asyncRoute, unauthorized } from '../lib/http.js'
import * as orders from '../services/order.service.js'

const customConfigSchema = z
  .object({
    fit: z.enum(['regular', 'oversized']),
    size: z.string().trim().max(20).optional(),
    colorId: z.string().trim().max(40).optional(),
    placements: z.array(z.object({ scale: z.number() }).passthrough()).min(1).max(10),
  })
  .passthrough()

const orderItemSchema = z.object({
  kind: z.enum(['printed', 'custom']).default('printed'),
  productSlug: z.string().trim().max(120).nullable().optional(),
  nameEn: z.string().trim().min(1).max(200),
  nameTa: z.string().trim().max(300).default(''),
  size: z.string().trim().min(1).max(20),
  colorEn: z.string().trim().max(60).default(''),
  colorTa: z.string().trim().max(120).default(''),
  image: z.string().trim().max(2000).nullable().optional(),
  customConfig: customConfigSchema.optional(),
  quantity: z.coerce.number().int().min(1).max(10),
  unitPrice: z.coerce.number().int().min(0).max(1_000_000),
})

const createOrderSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(2).max(80),
    phone: z.string().trim().regex(/^[0-9+\-\s]{10,15}$/, 'Enter a valid phone number.'),
    address1: z.string().trim().min(5).max(200),
    address2: z.string().trim().max(200).optional().default(''),
    city: z.string().trim().min(1).max(80),
    state: z.string().trim().min(1).max(80),
    pincode: z.string().trim().regex(/^[0-9]{6}$/, 'Enter a 6-digit PIN code.'),
  }),
  paymentMethod: z.enum(['cod', 'online']).default('cod'),
  items: z.array(orderItemSchema).min(1, 'An order needs at least one item.').max(50),
})

const statusSchema = z.object({
  status: z.enum(orders.ORDER_STATUSES),
  note: z.string().trim().max(300).optional(),
})

const trackSchema = z.object({
  orderNumber: z
    .string()
    .trim()
    .min(4, 'Enter your order number.')
    .max(40)
    .regex(/^[A-Za-z0-9-]+$/, 'Order numbers only contain letters, numbers and dashes.'),
})

const orderRefSchema = z.object({
  id: z.string().trim().regex(/^[A-Za-z0-9-]{4,40}$/, 'Invalid order reference.'),
})

const orderIdSchema = z.object({
  id: z.string().uuid('Invalid order id.'),
})

/** Public. Deliberately returns nothing beyond the status card on /track. */
export const trackOrder = asyncRoute(async (req: Request, res: Response) => {
  const { orderNumber } = trackSchema.parse(req.params)
  const order = await orders.trackOrder(orderNumber)

  res.setHeader('Cache-Control', 'no-store')
  if (!order) {
    res.status(404).json({ error: 'No order found with that number.' })
    return
  }
  res.json({ order })
})

export const listOrders = asyncRoute(async (req: Request, res: Response) => {
  if (!req.user) throw unauthorized()
  const data = await orders.listOrders(req.user)
  res.json({ orders: data })
})

export const getOrder = asyncRoute(async (req: Request, res: Response) => {
  if (!req.user) throw unauthorized()
  const { id } = orderRefSchema.parse(req.params)
  res.json(await orders.getOrder(req.user, id))
})

export const createOrder = asyncRoute(async (req: Request, res: Response) => {
  if (!req.user) throw unauthorized()
  const input = createOrderSchema.parse(req.body)
  const result = await orders.createOrder(req.user.id, input)
  res.status(201).json(result)
})

export const updateOrderStatus = asyncRoute(async (req: Request, res: Response) => {
  const { id } = orderIdSchema.parse(req.params)
  const { status, note } = statusSchema.parse(req.body)
  const order = await orders.updateOrderStatus(id, status, note)
  res.json({ order })
})
