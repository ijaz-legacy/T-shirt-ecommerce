import { supabase } from './supabase'
import { api } from './api'
import type { Product, Sticker } from './types'

/** The owner account. Only this email can manage staff. */
export const OWNER_EMAILS = ['theijazlegacy@gmail.com'] as const
export type OwnerEmail = (typeof OWNER_EMAILS)[number]

export interface AdminUser {
  email: string | null
  /** Set by the server/service role only — safe to trust for a role. */
  app_metadata?: Record<string, unknown> | undefined
  /** User-editable, so it is never used to grant access. */
  user_metadata?: Record<string, unknown> | undefined
}

export function isOwner(user: AdminUser | null): boolean {
  if (!user || !user.email) return false
  return OWNER_EMAILS.includes(user.email.toLowerCase() as OwnerEmail)
}

/**
 * Synchronous owner check only. Staff added from Admin → Staff are stored in
 * the database, so use useStaffAccess() to decide what to show in the UI.
 *
 * Roles are read from `app_metadata`, which only the service role can write.
 * `user_metadata` is editable by the signed-in user and must never grant
 * privileges.
 */
export function isAdmin(user: AdminUser | null): boolean {
  if (!user || !user.email) return false
  if (isOwner(user)) return true
  return (user.app_metadata?.role as string | undefined) === 'staff'
}

export interface StaffMember {
  email: string
  role: 'owner' | 'staff'
  active: boolean
  label: string
  created_at?: string
}

/** RLS limits non-owners to their own row; the owner sees the whole roster. */
export async function fetchStaff(): Promise<StaffMember[]> {
  const { data, error } = await supabase
    .from('staff')
    .select('email, role, active, label, created_at')
    .order('role')
    .order('email')
  if (error) throw new Error(error.message)
  return (data ?? []) as StaffMember[]
}

/** Returns the caller's own role, or null when they are not staff. */
export async function fetchMyRole(email: string): Promise<'owner' | 'staff' | null> {
  const { data, error } = await supabase
    .from('staff')
    .select('role, active')
    .eq('email', email.toLowerCase())
    .maybeSingle()
  if (error) return null
  if (!data || !(data as { active: boolean }).active) return null
  return (data as { role: 'owner' | 'staff' }).role
}

export async function addStaff(email: string, label?: string): Promise<void> {
  const clean = email.trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) throw new Error('Enter a valid email address.')
  if (OWNER_EMAILS.includes(clean as OwnerEmail)) throw new Error('That address is already the owner.')
  const { error } = await supabase
    .from('staff')
    .insert({ email: clean, role: 'staff', active: true, label: label?.trim() ?? '' })
  if (error) {
    if (error.code === '23505') throw new Error('That email already has a role.')
    throw new Error(error.message)
  }
}

export async function updateStaff(email: string, patch: Partial<Pick<StaffMember, 'active' | 'label'>>): Promise<void> {
  if (OWNER_EMAILS.includes(email.toLowerCase() as OwnerEmail)) {
    throw new Error('The owner account cannot be changed here.')
  }
  const { error } = await supabase.from('staff').update(patch).eq('email', email.toLowerCase())
  if (error) throw new Error(error.message)
}

export async function removeStaff(email: string): Promise<void> {
  if (OWNER_EMAILS.includes(email.toLowerCase() as OwnerEmail)) {
    throw new Error('The owner account cannot be removed.')
  }
  const { error } = await supabase.from('staff').delete().eq('email', email.toLowerCase())
  if (error) throw new Error(error.message)
}

function slugBase(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim()
    .split(/\s+/)
    .join('-')
    .toLowerCase()
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    || 'tee'
}

async function slugExists(slug: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('products')
    .select('slug', { count: 'exact', head: true })
    .eq('slug', slug)
  if (error) return false
  return data != null && (data as unknown as number) > 0
}

export async function makeSlug(name: string, suggested?: string): Promise<string> {
  const base = slugBase(suggested ?? name)
  if (!(await slugExists(base))) return base
  for (let n = 2; n < 100; n++) {
    const trial = `${base}-${n}`
    if (!(await slugExists(trial))) return trial
  }
  return `${base}-${Date.now()}`
}

export interface UploadedImage {
  publicPath: string
  stored: { bytes: string; mime: string; width: number; height: number } | null
  width: number
  height: number
}

const MAX_DIM = 1200

export async function resizeToWebP(file: File, maxDim?: number): Promise<UploadedImage> {
  const m = maxDim ?? MAX_DIM

  const { width: imgW, height: imgH } = await imageSize(file)
  const scale = Math.min(1, m / Math.max(imgW, imgH))
  const w = Math.max(1, Math.round(imgW * scale))
  const h = Math.max(1, Math.round(imgH * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(await loadImage(file), 0, 0, w, h)

  const blob = await new Promise<Blob | null>(r => canvas.toBlob(r!, 'image/webp', 0.88))
  if (!blob) throw new Error('Image encode failed')
  const bytes = await blob.arrayBuffer()
  const b64 = bytesToBase64(new Uint8Array(bytes))

  return {
    publicPath: '',
    stored: {
      bytes: b64,
      mime: 'image/webp',
      width: w,
      height: h,
    },
    width: w,
    height: h,
  }
}

export async function imageSize(file: File): Promise<{ width: number; height: number }> {
  const img = await loadImage(file)
  return { width: img.naturalWidth, height: img.naturalHeight }
}

async function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { resolve(img); URL.revokeObjectURL(url) }
    img.onerror = () => { reject(new Error('Image load failed')); URL.revokeObjectURL(url) }
    img.src = url
  })
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64)
  const out = new Uint8Array(new ArrayBuffer(bin.length))
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

/** Turns a stored_image record back into real binary for an upload. */
export function storedToBlob(stored: { bytes: string; mime: string }): Blob {
  return new Blob([base64ToBytes(stored.bytes)], { type: stored.mime })
}

/** Bucket the admin uploads into — public read, staff-only write. */
const IMAGE_BUCKET = 'client-images' as const

export async function tryStorageUpload(
  bucket: 'images' | 'client-images',
  path: string,
  blob: Blob,
): Promise<string> {
  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType: 'image/webp',
    upsert: false,
  })
  if (error) return ''
  const { data } = await supabase.storage.from(bucket).getPublicUrl(path)
  return data?.publicUrl ?? ''
}

export async function saveProduct(form: {
  nameEn: string
  nameTa: string
  descEn: string
  descTa: string
  price: number
  colorEn: string
  colorTa: string
  colorHex: string
  category: string
  badge: string | null
  featured: boolean
  stock: number
  slug?: string
  imageFile?: File | null
  imageUrl?: string
}): Promise<{ product: Product; uploadedPath?: string; fallback?: boolean }> {
  const slug = await makeSlug(form.nameEn, form.slug)
  let imageValue = form.imageUrl ?? ''
  let uploadedPath: string | undefined
  let fallback = false
  let stored: NonNullable<UploadedImage['stored']> | null = null

  if (form.imageFile) {
    const r = await resizeToWebP(form.imageFile)
    const blobBytes = r.stored
    stored = blobBytes
    const storagePath = await tryStorageUpload(IMAGE_BUCKET, `products/${slug}/${slug}-${Date.now()}.webp`, storedToBlob(blobBytes!))
    if (storagePath) {
      imageValue = storagePath
      uploadedPath = storagePath
    } else {
      imageValue = ''
      fallback = true
    }
  }

  const row = {
    slug,
    name_en: form.nameEn,
    name_ta: form.nameTa,
    desc_en: form.descEn,
    desc_ta: form.descTa,
    price: form.price,
    image: imageValue,
    color_en: form.colorEn,
    color_ta: form.colorTa,
    color_hex: form.colorHex,
    category: form.category,
    badge: form.badge,
    featured: form.featured,
    stock: form.stock,
    active: true,
    sort_order: 999,
    ...(fallback && stored ? { stored_image: { bytes: stored!.bytes, mime: 'image/webp', width: stored!.width, height: stored!.height } } : {}),
  }

  const { error } = await supabase.from('products').insert(row).select()
  if (error) throw new Error(error.message)

  const { data: productData, error: selectError } = await supabase.from('products').select('*').eq('slug', slug).single()
  if (selectError || !productData) throw new Error(selectError?.message ?? 'Product not found after insert')
  return { product: productData, uploadedPath, fallback }
}

export async function uploadProductImage(slug: string, file: File): Promise<string> {
  const r = await resizeToWebP(file)
  if (!r.stored) throw new Error('Could not process that image.')
  const url = await tryStorageUpload(IMAGE_BUCKET, `products/${slug}/${slug}-${Date.now()}.webp`, storedToBlob(r.stored))
  if (!url) throw new Error('Upload was rejected. Run supabase-staff.sql so staff can write to the client-images bucket.')
  return url
}

export async function updateProduct(slug: string, patch: Partial<Product>): Promise<Product> {
  const { error } = await supabase.from('products').update(patch).eq('slug', slug).select()
  if (error) throw new Error(error.message)
  const { data, error: selectError } = await supabase.from('products').select('*').eq('slug', slug).single()
  if (selectError || !data) throw new Error(selectError?.message ?? 'Product not found')
  return data
}

export async function deleteProduct(slug: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('slug', slug).select()
  if (error) throw new Error(error.message)
}

export async function saveSticker(form: {
  nameEn: string
  nameTa: string
  category: string
  imageFile?: File | null
  imageUrl?: string
}): Promise<{ sticker: Sticker; uploadedPath?: string; fallback?: boolean }> {
  let imageValue = form.imageUrl ?? ''
  let uploadedPath: string | undefined
  let fallback = false
  let stored: NonNullable<UploadedImage['stored']> | null = null

  if (form.imageFile) {
    const r = await resizeToWebP(form.imageFile, 800)
    const blobBytes = r.stored
    stored = blobBytes
    const storagePath = await tryStorageUpload(IMAGE_BUCKET, `stickers/${slugifyStickerId(form.nameEn)}/${Date.now()}.webp`, storedToBlob(blobBytes!))
    if (storagePath) {
      imageValue = storagePath
      uploadedPath = storagePath
    } else {
      imageValue = ''
      fallback = true
    }
  }

  const { error } = await supabase.from('stickers').insert({
    name_en: form.nameEn,
    name_ta: form.nameTa,
    image_url: imageValue,
    category: form.category,
    active: true,
    sort_order: 999,
    ...(fallback && stored ? { stored_image: { bytes: stored!.bytes, mime: 'image/webp', width: stored!.width, height: stored!.height } } : {}),
  }).select()
  if (error) throw new Error(error.message)

  const { data, error: selectError } = await supabase.from('stickers').select('*').order('sort_order').eq('active', true).neq('image_url', '')
  if (selectError) throw new Error(selectError.message)
  const sticker = data?.[data.length - 1]
  if (!sticker) throw new Error('Sticker insert returned no row')
  return { sticker, uploadedPath, fallback }
}

export async function updateSticker(id: string, patch: Partial<Sticker>): Promise<Sticker> {
  const { error } = await supabase.from('stickers').update(patch).eq('id', id).select()
  if (error) throw new Error(error.message)
  const { data, error: selectError } = await supabase.from('stickers').select('*').eq('id', id).single()
  if (selectError || !data) throw new Error(selectError?.message ?? 'Sticker not found')
  return data
}

export async function deleteSticker(id: string): Promise<void> {
  const { error } = await supabase.from('stickers').delete().eq('id', id).select()
  if (error) throw new Error(error.message)
}

function slugifyStickerId(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .join('-')
    .toLowerCase()
    .replace(/-+/g, '-')
    .slice(0, 40) || 'sticker'
}

export interface AdminOrder {
  id: string
  order_number: string
  user_id: string | null
  status: 'placed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  customer_name: string
  phone: string
  address1: string
  address2?: string
  city: string
  state: string
  pincode: string
  subtotal: number
  shipping_fee: number
  total: number
  payment_method: string
  created_at: string
  items?: AdminOrderItem[]
}

export interface AdminOrderItem {
  id: string
  order_id: string
  kind: 'printed' | 'custom'
  product_slug?: string | null
  name_en: string
  name_ta?: string
  size: string
  color_en: string
  color_ta?: string
  image?: string | null
  custom_config?: any
  quantity: number
  unit_price: number
}

export async function fetchAdminOrders(): Promise<AdminOrder[]> {
  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      const res = await api.get<{ orders?: AdminOrder[] } | AdminOrder[]>('/orders')
      return Array.isArray(res) ? res : res.orders || []
    }

    const orderList = (orders ?? []) as AdminOrder[]
    if (orderList.length === 0) return []

    const orderIds = orderList.map(o => o.id)
    const { data: items } = await supabase
      .from('order_items')
      .select('*')
      .in('order_id', orderIds)

    const itemsByOrder: Record<string, AdminOrderItem[]> = {}
    for (const it of (items ?? []) as AdminOrderItem[]) {
      if (!itemsByOrder[it.order_id]) itemsByOrder[it.order_id] = []
      itemsByOrder[it.order_id].push(it)
    }

    return orderList.map(o => ({
      ...o,
      items: itemsByOrder[o.id] ?? [],
    }))
  } catch (err) {
    console.warn('Supabase order fetch failed, trying API:', err)
    const res = await api.get<{ orders?: AdminOrder[] } | AdminOrder[]>('/orders')
    return Array.isArray(res) ? res : res.orders || []
  }
}

export async function updateAdminOrderStatus(
  orderId: string,
  status: string,
  note?: string,
): Promise<void> {
  try {
    await api.patch(`/orders/${orderId}/status`, { status, note })
    return
  } catch (err) {
    console.warn('API status patch failed, updating Supabase directly:', err)
  }

  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)

  if (error) throw new Error(error.message)

  try {
    await supabase.from('order_status_events').insert({
      order_id: orderId,
      status,
      note: note || `Status updated to ${status}`,
    })
  } catch {
    // optional event record
  }
}
