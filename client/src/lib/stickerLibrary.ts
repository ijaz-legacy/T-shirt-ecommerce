import { CUSTOM_PRICE_LARGE, CUSTOM_PRICE_MEDIUM, CUSTOM_PRICE_SMALL } from './catalog'
import { formatINR } from './currency'

/**
 * Sticker artwork lives in the database (`public.stickers`, image served from
 * Supabase Storage) and is managed from Admin. The bundle ships no artwork of
 * its own, so the studio only ever shows what the shop actually owns.
 *
 * Size is not a property of the artwork: a sticker becomes small, medium or
 * large by how far the customer resizes it on the tee, and the price follows
 * the scale (`getCategoryFromScale`).
 */
export interface LibrarySticker {
  id: string
  name: string
  src: string
}

/** The columns `toLibraryStickers` needs from a `stickers` row. */
export interface StickerRow {
  id: string
  name_en?: string | null
  image_url?: string | null
}

/**
 * Print-size options for uploaded photos (CropModal), priced from the same
 * constants the studio charges with, so the copy can't drift.
 */
export const STICKER_GROUPS = [
  { id: 'small', label: 'Logos & icons', hint: `Small print · ${formatINR(CUSTOM_PRICE_SMALL)}` },
  { id: 'medium', label: 'Graphic designs', hint: `Half A4 · ${formatINR(CUSTOM_PRICE_MEDIUM)}` },
  { id: 'large', label: 'Full print', hint: `Full A4 · ${formatINR(CUSTOM_PRICE_LARGE)}` },
] as const

/** True when a placement ref points at sticker artwork rather than an upload. */
export const isStickerRef = (ref: string): boolean =>
  ref.includes('/stickers/') || ref.startsWith('./stickers/')

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
    }))
}
