import type { StickerCategory } from './catalog'

/**
 * Sticker artwork lives in the database (`public.stickers`, image served from
 * Supabase Storage) and is managed from Admin. The bundle ships no artwork of
 * its own, so the studio only ever shows what the shop actually owns.
 */
export interface LibrarySticker {
  id: string
  name: string
  src: string
  category: StickerCategory
}

/** The columns `toLibraryStickers` needs from a `stickers` row. */
export interface StickerRow {
  id: string
  name_en?: string | null
  name_ta?: string | null
  image_url?: string | null
  category?: string | null
  sort_order?: number | null
}

export const STICKER_GROUPS: { id: StickerCategory; label: string; hint: string }[] = [
  { id: 'small', label: 'Logos & icons', hint: 'Small print · ₹49' },
  { id: 'medium', label: 'Graphic designs', hint: 'Half A4 · ₹79' },
  { id: 'large', label: 'Full print', hint: 'Full A4 · ₹119' },
]

/** True when a placement ref points at sticker artwork rather than an upload. */
export const isStickerRef = (ref: string): boolean =>
  ref.includes('/stickers/') || ref.startsWith('./stickers/')

const CATEGORIES: StickerCategory[] = ['small', 'medium', 'large']

const isCategory = (value: string | null | undefined): value is StickerCategory =>
  CATEGORIES.includes(value as StickerCategory)

/**
 * Database rows → studio palette. Rows without an image URL are skipped: there
 * is nothing to print, and the storefront has no local artwork to fall back on.
 */
export function toLibraryStickers(rows: StickerRow[]): LibrarySticker[] {
  return rows
    .filter((row) => (row.image_url ?? '').trim().length > 0)
    .map((row) => ({
      id: row.id,
      name: (row.name_en ?? '').trim() || 'Sticker',
      src: (row.image_url ?? '').trim(),
      category: isCategory(row.category) ? row.category : 'medium',
    }))
}
