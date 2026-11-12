import type { Request, Response } from 'express'
import { z } from 'zod'
import { asyncRoute } from '../lib/http.js'
import * as products from '../services/product.service.js'

const listQuerySchema = z.object({
  category: z.string().trim().min(1).optional(),
  featured: z.enum(['true', 'false']).optional(),
  search: z.string().trim().min(1).optional(),
  includeInactive: z.enum(['true', 'false']).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
})

const productBodySchema = z.object({
  nameEn: z.string().trim().min(1, 'nameEn is required.').max(120),
  nameTa: z.string().trim().max(200).optional(),
  descEn: z.string().trim().max(2000).optional(),
  descTa: z.string().trim().max(2000).optional(),
  price: z.coerce.number().int().min(0).max(1_000_000),
  image: z.string().trim().max(2000).optional(),
  colorEn: z.string().trim().max(40).optional(),
  colorTa: z.string().trim().max(80).optional(),
  colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  category: z.string().trim().max(40).optional(),
  badge: z.string().trim().max(40).nullable().optional(),
  featured: z.boolean().optional(),
  stock: z.coerce.number().int().min(0).max(100_000).optional(),
  active: z.boolean().optional(),
  slug: z.string().trim().max(120).optional(),
})

const productPatchSchema = productBodySchema.partial()

const slugParamSchema = z.object({
  slug: z.string().trim().regex(/^[a-z0-9-]{1,80}$/, 'Invalid product slug.'),
})

function isStaffRole(role: string | undefined): boolean {
  return role === 'owner' || role === 'staff'
}

export const listProducts = asyncRoute(async (req: Request, res: Response) => {
  const query = listQuerySchema.parse(req.query)
  // Hidden products are staff-only. Checking `req.user` alone was wrong: any
  // signed-in customer could list inactive products by adding includeInactive.
  const includeInactive = query.includeInactive === 'true' && isStaffRole(req.user?.role)

  const data = await products.listProducts({
    category: query.category,
    featured: query.featured === undefined ? undefined : query.featured === 'true',
    search: query.search,
    includeInactive,
    limit: query.limit,
  })
  res.json({ products: data })
})

export const getProduct = asyncRoute(async (req: Request, res: Response) => {
  const { slug } = slugParamSchema.parse(req.params)
  const product = await products.getProduct(slug)
  res.json({ product })
})

export const createProduct = asyncRoute(async (req: Request, res: Response) => {
  const input = productBodySchema.parse(req.body)
  const product = await products.createProduct(input)
  res.status(201).json({ product })
})

export const updateProduct = asyncRoute(async (req: Request, res: Response) => {
  const { slug } = slugParamSchema.parse(req.params)
  const patch = productPatchSchema.parse(req.body)
  const product = await products.updateProduct(slug, patch)
  res.json({ product })
})

export const deleteProduct = asyncRoute(async (req: Request, res: Response) => {
  const { slug } = slugParamSchema.parse(req.params)
  await products.deleteProduct(slug)
  res.status(204).end()
})
