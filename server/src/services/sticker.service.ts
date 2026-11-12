import { notFound } from '../lib/http.js'
import { db } from '../lib/supabase.js'
import type { Sticker } from '../types/index.js'

const TABLE = 'stickers'

export interface StickerInput {
  nameEn: string
  nameTa?: string
  imageUrl: string
  category?: string
  active?: boolean
  sortOrder?: number
}

export async function listStickers(options: { includeInactive?: boolean } = {}): Promise<Sticker[]> {
  let query = db().from(TABLE).select('*').order('sort_order').order('name_en')
  if (!options.includeInactive) query = query.eq('active', true)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as Sticker[]
}

export async function createSticker(input: StickerInput): Promise<Sticker> {
  const { data, error } = await db()
    .from(TABLE)
    .insert({
      name_en: input.nameEn,
      name_ta: input.nameTa ?? '',
      image_url: input.imageUrl,
      category: input.category ?? 'medium',
      active: input.active ?? true,
      sort_order: input.sortOrder ?? 999,
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data as Sticker
}

export async function updateSticker(id: string, input: Partial<StickerInput>): Promise<Sticker> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.nameEn !== undefined) patch.name_en = input.nameEn
  if (input.nameTa !== undefined) patch.name_ta = input.nameTa
  if (input.imageUrl !== undefined) patch.image_url = input.imageUrl
  if (input.category !== undefined) patch.category = input.category
  if (input.active !== undefined) patch.active = input.active
  if (input.sortOrder !== undefined) patch.sort_order = input.sortOrder

  const { data, error } = await db().from(TABLE).update(patch).eq('id', id).select('*').maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw notFound('Sticker not found.')
  return data as Sticker
}

export async function deleteSticker(id: string): Promise<void> {
  const { error, count } = await db().from(TABLE).delete({ count: 'exact' }).eq('id', id)
  if (error) throw new Error(error.message)
  if (!count) throw notFound('Sticker not found.')
}
