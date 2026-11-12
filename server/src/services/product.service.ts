import { notFound } from '../lib/http.js'
import { db } from '../lib/supabase.js'
import type { Product } from '../types/index.js'

const TABLE = 'products'

export interface ListProductsOptions {
  category?: string
  featured?: boolean
  search?: string
  includeInactive?: boolean
  limit?: number
}

export interface ProductInput {
  nameEn: string
  nameTa?: string
  descEn?: string
  descTa?: string
  price: number
  image?: string
  colorEn?: string
  colorTa?: string
  colorHex?: string
  category?: string
  badge?: string | null
  featured?: boolean
  stock?: number
  active?: boolean
  slug?: string
}

function escapeForOr(value: string): string {
  // Commas and parentheses would break PostgREST's `or` filter syntax.
  return value.replace(/[(),%]/g, ' ').trim()
}

export async function listProducts(options: ListProductsOptions = {}): Promise<Product[]> {
  let query = db().from(TABLE).select('*').order('sort_order').order('name_en')

  if (!options.includeInactive) query = query.eq('active', true)
  if (options.category) query = query.eq('category', options.category)
  if (typeof options.featured === 'boolean') query = query.eq('featured', options.featured)

  const search = options.search ? escapeForOr(options.search) : ''
  if (search) query = query.or(`name_en.ilike.%${search}%,name_ta.ilike.%${search}%`)
  if (options.limit) query = query.limit(options.limit)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as Product[]
}

export async function getProduct(slug: string, includeInactive = false): Promise<Product> {
  let query = db().from(TABLE).select('*').eq('slug', slug)
  if (!includeInactive) query = query.eq('active', true)

  const { data, error } = await query.maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw notFound(`No product with slug "${slug}".`)
  return data as Product
}

function slugify(value: string): string {
  return (
    value
      .normalize('NFKD')
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .trim()
      .split(/\s+/)
      .join('-')
      .toLowerCase()
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'tee'
  )
}

export async function uniqueSlug(name: string, suggested?: string): Promise<string> {
  const base = slugify(suggested ?? name)
  const { data } = await db().from(TABLE).select('slug').like('slug', `${base}%`)
  const taken = new Set((data ?? []).map(row => (row as { slug: string }).slug))

  if (!taken.has(base)) return base
  for (let n = 2; n < 100; n += 1) {
    const candidate = `${base}-${n}`
    if (!taken.has(candidate)) return candidate
  }
  return `${base}-${Date.now()}`
}

export async function createProduct(input: ProductInput): Promise<Product> {
  const slug = await uniqueSlug(input.nameEn, input.slug)

  const row = {
    slug,
    name_en: input.nameEn,
    name_ta: input.nameTa ?? '',
    desc_en: input.descEn ?? '',
    desc_ta: input.descTa ?? '',
    price: input.price,
    image: input.image ?? '',
    color_en: input.colorEn ?? '',
    color_ta: input.colorTa ?? '',
    color_hex: input.colorHex ?? '#000000',
    category: input.category ?? 'nature',
    badge: input.badge ?? null,
    featured: input.featured ?? false,
    stock: input.stock ?? 25,
    active: input.active ?? true,
    sort_order: 999,
  }

  const { data, error } = await db().from(TABLE).insert(row).select('*').single()
  if (error) throw new Error(error.message)
  return data as Product
}

export async function updateProduct(slug: string, input: Partial<ProductInput>): Promise<Product> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (input.nameEn !== undefined) patch.name_en = input.nameEn
  if (input.nameTa !== undefined) patch.name_ta = input.nameTa
  if (input.descEn !== undefined) patch.desc_en = input.descEn
  if (input.descTa !== undefined) patch.desc_ta = input.descTa
  if (input.price !== undefined) patch.price = input.price
  if (input.image !== undefined) patch.image = input.image
  if (input.colorEn !== undefined) patch.color_en = input.colorEn
  if (input.colorTa !== undefined) patch.color_ta = input.colorTa
  if (input.colorHex !== undefined) patch.color_hex = input.colorHex
  if (input.category !== undefined) patch.category = input.category
  if (input.badge !== undefined) patch.badge = input.badge
  if (input.featured !== undefined) patch.featured = input.featured
  if (input.stock !== undefined) patch.stock = input.stock
  if (input.active !== undefined) patch.active = input.active
  if (input.slug !== undefined) patch.slug = await uniqueSlug(input.slug, input.slug)

  const { data, error } = await db().from(TABLE).update(patch).eq('slug', slug).select('*').maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw notFound(`No product with slug "${slug}".`)
  return data as Product
}

export async function deleteProduct(slug: string): Promise<void> {
  const { error, count } = await db().from(TABLE).delete({ count: 'exact' }).eq('slug', slug)
  if (error) throw new Error(error.message)
  if (!count) throw notFound(`No product with slug "${slug}".`)
}
