import {
  CUSTOM_PRICE_LARGE,
  CUSTOM_PRICE_MEDIUM,
  CUSTOM_PRICE_SMALL,
  type StickerCategory,
} from './catalog'
import { formatINR } from './currency'

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
  image_url?: string | null
  category?: string | null
}

/**
 * One entry per studio tab. Prices come from the same constants the studio
 * charges with, so a price change updates these hints automatically.
 */
export const STICKER_GROUPS = [
  { id: 'small', label: 'Logos & icons', hint: `Small print · ${formatINR(CUSTOM_PRICE_SMALL)}` },
  { id: 'medium', label: 'Graphic designs', hint: `Half A4 · ${formatINR(CUSTOM_PRICE_MEDIUM)}` },
  { id: 'large', label: 'Full print', hint: `Full A4 · ${formatINR(CUSTOM_PRICE_LARGE)}` },
] as const satisfies readonly { id: StickerCategory; label: string; hint: string }[]

/** True when a placement ref points at sticker artwork rather than an upload. */
export const isStickerRef = (ref: string): boolean =>
  ref.includes('/stickers/') || ref.startsWith('./stickers/')

const isCategory = (value: string | null | undefined): value is StickerCategory =>
  STICKER_GROUPS.some((group) => group.id === value)

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
