import { useEffect, useRef, useState } from 'react'
import { Tee3DPreview } from './Tee3DPreview'
import type { StickerPlacement } from '../../lib/types'

/**
 * Static 3D thumbnail for a saved design.
 *
 * Mounting a live WebGL canvas per card froze the browser with ~9 designs, so
 * one off-screen renderer walks the list: it renders each garment once, keeps
 * the PNG in memory, and the card then shows a plain <img>. The queue is
 * module-level, so only one canvas ever exists at a time.
 */
const cache = new Map<string, string>()
let queue: Promise<void> = Promise.resolve()

function cacheKey(designId: string, colorHex: string, placements: StickerPlacement[]): string {
  const art = placements
    .map((p) => `${p.ref}|${p.scale}|${p.x}|${p.y}|${p.rotation}|${p.side ?? 'front'}|${p.text?.content ?? ''}`)
    .join('~')
  return `${designId}|${colorHex}|${art}`
}

export function DesignPoster({
  designId,
  colorHex,
  placements,
  height = 200,
}: {
  designId: string
  colorHex: string
  placements: StickerPlacement[]
  height?: number
}) {
  const key = cacheKey(designId, colorHex, placements)
  const [src, setSrc] = useState<string | undefined>(() => cache.get(key))
  const [active, setActive] = useState(false)
  const [inView, setInView] = useState(false)
  const hostRef = useRef<HTMLDivElement>(null)
  const finishRef = useRef<(url?: string) => void>(() => {})

  // Only designs on screen are worth a 3D render; scrolling reveals the rest.
  useEffect(() => {
    const host = hostRef.current
    if (!host || inView) return
    const observer = new IntersectionObserver(
      (entries) => { if (entries.some(entry => entry.isIntersecting)) setInView(true) },
      { rootMargin: '200px' },
    )
    observer.observe(host)
    // Guarantee a poster even if intersection callbacks never arrive (hidden
    // tab, exotic browser): render it anyway shortly after mount.
    const fallback = window.setTimeout(() => setInView(true), 1200)
    return () => {
      observer.disconnect()
      window.clearTimeout(fallback)
    }
  }, [inView])

  useEffect(() => {
    if (src || !inView) return
    let cancelled = false

    queue = queue.then(
      () =>
        new Promise<void>((resolve) => {
          if (cancelled) return resolve()
          const cached = cache.get(key)
          if (cached) {
            setSrc(cached)
            return resolve()
          }

          let settled = false
          const done = (url?: string) => {
            if (settled) return
            settled = true
            window.clearTimeout(timer)
            if (url) {
              cache.set(key, url)
              setSrc(url)
            }
            setActive(false)
            resolve()
          }
          const timer = window.setTimeout(() => done(), 8000)
          finishRef.current = done
          setActive(true)
        }),
    )

    return () => {
      cancelled = true
      finishRef.current()
    }
  }, [key, src, inView])

  if (src) {
    return (
      <img
        src={src}
        alt=""
        style={{ width: '100%', height, objectFit: 'contain', display: 'block' }}
      />
    )
  }

  return (
    <div ref={hostRef} style={{ height, display: 'grid', placeItems: 'center', color: 'var(--smoke)', fontSize: 11 }}>
      {active ? (
        <div
          aria-hidden
          style={{ position: 'fixed', left: -10000, top: 0, width: 260, height: 260, pointerEvents: 'none', opacity: 0 }}
        >
          <Tee3DPreview
            colorHex={colorHex}
            placements={placements}
            height={260}
            minimal
            onPoster={(url) => finishRef.current(url)}
          />
        </div>
      ) : (
        <span>{inView ? 'Loading preview…' : ''}</span>
      )}
    </div>
  )
}
