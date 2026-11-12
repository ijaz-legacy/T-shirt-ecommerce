import { getSticker, parsePlacementRef, type Sticker } from '../../lib/catalog'
import type { StickerPlacement } from '../../lib/types'
import { PRINT_AREA, TEE_VIEW_H, TEE_VIEW_W } from '../tee/teeGeometry'

/**
 * Renders the customer's placements into one transparent canvas that becomes
 * the print texture on the 3D tee. The drawing maths mirror TeeCanvas exactly
 * (placement x/y/scale/rotation are percentages of the 400×460 tee viewBox),
 * so what the customer arranges in the 2D editor is what gets printed.
 */

/** Texture pixels per viewBox unit. */
const PX = 4
const MIN_W = 8
const MAX_W = 72
/** TeeCanvas never lets a sticker shrink below ~40 CSS px; match that floor. */
const MIN_PCT = 15

const FONT_STACKS: Record<string, string> = {
  sans: "'DM Sans', system-ui, -apple-system, sans-serif",
  display: "'Bricolage Grotesque', system-ui, sans-serif",
  serif: "'Instrument Serif', Georgia, serif",
  mono: 'ui-monospace, SFMono-Regular, monospace',
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v))
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

function drawContained(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  crop?: { offsetX: number; offsetY: number; zoom: number },
  radius?: number,
) {
  const iw = img.naturalWidth || img.width
  const ih = img.naturalHeight || img.height
  if (!iw || !ih) return

  const z = crop?.zoom && crop.zoom > 1 ? crop.zoom : 1
  if (z > 1 || (crop && (crop.offsetX !== 0 || crop.offsetY !== 0))) {
    // Crop & Zoom mode: zoom into the image, offset within the frame, clip to frame.
    const baseScale = Math.min(w / iw, h / ih)
    const scale = baseScale * z
    const dw = iw * scale
    const dh = ih * scale
    // offsetX/Y range from -1..1; at edges the image touches the frame edge.
    const maxOx = Math.max(0, (dw - w) / 2)
    const maxOy = Math.max(0, (dh - h) / 2)
    const ox = (crop?.offsetX ?? 0) * maxOx
    const oy = (crop?.offsetY ?? 0) * maxOy

    ctx.save()
    if (radius && radius > 0) {
      roundRect(ctx, x, y, w, h, radius)
    } else {
      ctx.beginPath()
      ctx.rect(x, y, w, h)
    }
    ctx.clip()
    ctx.drawImage(img, x + (w - dw) / 2 + ox, y + (h - dh) / 2 + oy, dw, dh)
    ctx.restore()
  } else {
    const scale = Math.min(w / iw, h / ih)
    const dw = iw * scale
    const dh = ih * scale
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
  }
}

/** Greedy word wrap; over-long words are broken character by character. */
function wrap(text: string, maxW: number, measure: (line: string) => number): string[] {
  const lines: string[] = []
  for (const rawLine of text.split('\n')) {
    const words = rawLine.split(/\s+/).filter(Boolean)
    if (words.length === 0) {
      lines.push('')
      continue
    }
    let current = ''
    for (let word of words) {
      const candidate = current ? `${current} ${word}` : word
      if (measure(candidate) <= maxW) {
        current = candidate
        continue
      }
      if (current) lines.push(current)
      // Break a single word that is wider than the box.
      while (measure(word) > maxW && word.length > 1) {
        let cut = word.length
        while (cut > 1 && measure(word.slice(0, cut)) > maxW) cut -= 1
        lines.push(word.slice(0, cut))
        word = word.slice(cut)
      }
      current = word
    }
    if (current) lines.push(current)
  }
  return lines.length ? lines : ['']
}

function drawText(ctx: CanvasRenderingContext2D, p: StickerPlacement, box: number) {
  const text = p.text
  if (!text || !text.content.trim()) return

  const pad = box * 0.04
  const maxW = Math.max(box - pad * 2, 1)
  const fs = clamp(box * 0.18, 12, 80)
  const family = FONT_STACKS[text.fontFamily ?? 'sans'] ?? FONT_STACKS.sans

  ctx.font = `${text.italic ? 'italic ' : ''}${text.bold ? '700 ' : '400 '}${fs}px ${family}`
  ctx.fillStyle = text.color || '#171512'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const lines = wrap(text.content, maxW, (line) => ctx.measureText(line).width)
  const lineHeight = fs * 1.2
  let y = -((lines.length - 1) * lineHeight) / 2
  for (const line of lines) {
    if (line) ctx.fillText(line, 0, y)
    y += lineHeight
  }
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    // Remote artwork (Supabase storage) needs CORS mode to stay untainted.
    if (/^https?:/i.test(src)) img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

async function loadArtwork(placements: StickerPlacement[]) {
  const sources = new Set<string>()
  for (const p of placements) {
    const parsed = parsePlacementRef(p.ref)
    if (parsed?.type === 'image') sources.add(p.ref)
  }
  const entries = await Promise.all(
    [...sources].map(async (src) => [src, await loadImage(src)] as const),
  )
  return new Map(entries)
}

/**
 * Turns the built-in vector stickers into image sources by serialising the
 * already-rendered SVG nodes from a hidden host element.
 */
export function builtinArtwork(host: HTMLElement | null): Map<number, string> {
  const out = new Map<number, string>()
  if (!host) return out
  host.querySelectorAll<HTMLElement>('[data-placement]').forEach((item) => {
    const svg = item.querySelector('svg')
    const index = Number(item.dataset.placement)
    if (!svg || Number.isNaN(index)) return
    const clone = svg.cloneNode(true) as SVGElement
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    clone.setAttribute('width', '256')
    clone.setAttribute('height', '256')
    clone.removeAttribute('style')
    out.set(
      index,
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(clone))}`,
    )
  })
  return out
}

/**
 * Paints one placement inside a square `box`, centred on the current origin and
 * already rotated. Shared by the flat print canvas and the 3D decal textures so
 * both views look identical.
 */
function paintPlacement(
  ctx: CanvasRenderingContext2D,
  p: StickerPlacement,
  box: number,
  sticker: Sticker | null,
  img: HTMLImageElement | null,
) {
  const isText = p.ref.startsWith('text:')
  const isImage = parsePlacementRef(p.ref)?.type === 'image'
  const bgShape = p.style?.bgShape ?? 'none'
  const bgColor = p.style?.bgColor ?? '#FFFFFF'
  const isTransparent = bgShape === 'transparent' || (bgShape === 'none' && isImage)
  const innerBg = isTransparent
    ? null
    : bgShape !== 'none'
      ? bgColor
      : sticker
        ? sticker.bg
        : null
  const radius =
    bgShape === 'circle'
      ? box / 2
      : bgShape === 'rounded'
        ? box * 0.2
        : bgShape === 'square'
          ? 4
          : sticker
            ? box / 2
            : 4

  if (innerBg) {
    roundRect(ctx, -box / 2, -box / 2, box, box, radius)
    ctx.fillStyle = innerBg
    ctx.fill()
  }

  if (isText) {
    drawText(ctx, p, box)
    return
  }
  if (!img) return
  const pad = isTransparent && isImage ? 0 : box * 0.1
  const size = Math.max(box - pad * 2, 1)
  drawContained(ctx, img, -size / 2, -size / 2, size, size, isImage ? p.crop : undefined, isTransparent ? undefined : radius)
}

export async function buildDesignCanvas(
  placements: StickerPlacement[],
  builtin: Map<number, string>,
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(PRINT_AREA.w * PX)
  canvas.height = Math.round(PRINT_AREA.h * PX)

  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  // The template fonts may still be loading on first paint.
  try {
    await document.fonts?.ready
  } catch {
    /* fonts are best-effort — the canvas falls back to the system face */
  }

  const artwork = await loadArtwork(placements)
  for (const [index, src] of builtin) {
    const img = await loadImage(src)
    if (img) artwork.set(`builtin:${index}`, img)
  }

  ctx.scale(PX, PX)
  ctx.translate(-PRINT_AREA.x, -PRINT_AREA.y)

  placements.forEach((p, index) => {
    const parsed = parsePlacementRef(p.ref)
    const isText = p.ref.startsWith('text:')
    if (!parsed && !isText) return
    if (isText && !p.text) return

    const sticker = parsed?.type === 'builtin' ? getSticker(parsed.id) : null
    const widthPct = clamp(Math.max(p.scale, MIN_PCT), MIN_W, MAX_W)
    const box = (widthPct / 100) * TEE_VIEW_W
    const img = sticker
      ? artwork.get(`builtin:${index}`) ?? null
      : parsed?.type === 'image'
        ? artwork.get(p.ref) ?? null
        : null

    ctx.save()
    ctx.translate((p.x / 100) * TEE_VIEW_W, (p.y / 100) * TEE_VIEW_H)
    ctx.rotate((p.rotation * Math.PI) / 180)
    paintPlacement(ctx, p, box, sticker, img)
    ctx.restore()
  })

  return canvas
}

/**
 * Renders a single placement into a transparent square canvas. Used as the
 * texture of a 3D decal so a sticker can sit on the real garment surface.
 */
export async function buildStickerCanvas(
  p: StickerPlacement,
  builtinSrc: string | undefined,
  px = 512,
): Promise<HTMLCanvasElement | null> {
  const parsed = parsePlacementRef(p.ref)
  const isText = p.ref.startsWith('text:')
  if (!parsed && !isText) return null
  if (isText && !p.text?.content.trim()) return null

  const sticker = parsed?.type === 'builtin' ? getSticker(parsed.id) : null
  let img: HTMLImageElement | null = null
  if (sticker) {
    img = builtinSrc ? await loadImage(builtinSrc) : null
  } else if (parsed?.type === 'image') {
    img = await loadImage(p.ref)
  } else if (!isText) {
    return null
  }

  const canvas = document.createElement('canvas')
  canvas.width = px
  canvas.height = px
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  try {
    await document.fonts?.ready
  } catch {
    /* fonts are best-effort */
  }

  ctx.save()
  ctx.translate(px / 2, px / 2)
  paintPlacement(ctx, p, px, sticker, img)
  ctx.restore()
  return canvas
}
