import { useEffect, useRef, useState } from 'react'
import { Move, ZoomIn } from 'lucide-react'
import { CATEGORY_UPLOAD_SIZE, type StickerCategory } from '../../lib/catalog'
import { STICKER_GROUPS } from '../../lib/stickerLibrary'

const BOX = 260

export interface CropResult {
  blob: Blob
  category: StickerCategory
}

/**
 * Square crop for customer uploads: drag the photo to reposition it, zoom to
 * crop tighter, then pick the print size. Output is a web-optimised WebP.
 */
export function CropModal({ file, onCancel, onConfirm }: {
  file: File
  onCancel: () => void
  onConfirm: (result: CropResult) => void
}) {
  const [url] = useState(() => URL.createObjectURL(file))
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [category, setCategory] = useState<StickerCategory>('medium')
  const [busy, setBusy] = useState(false)

  const imgRef = useRef<HTMLImageElement>(null)
  const drag = useRef<{ pid: number; sx: number; sy: number; ox: number; oy: number } | null>(null)

  useEffect(() => () => URL.revokeObjectURL(url), [url])

  // At zoom 1 the photo exactly covers the crop box.
  const cover = nat ? Math.max(BOX / nat.w, BOX / nat.h) : 1
  const dispW = nat ? nat.w * cover : BOX
  const dispH = nat ? nat.h * cover : BOX

  function clampPos(p: { x: number; y: number }, z = zoom) {
    if (!nat) return p
    const maxX = Math.max(0, (dispW * z - BOX) / 2)
    const maxY = Math.max(0, (dispH * z - BOX) / 2)
    return {
      x: Math.min(maxX, Math.max(-maxX, p.x)),
      y: Math.min(maxY, Math.max(-maxY, p.y)),
    }
  }

  function onDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!nat) return
    e.preventDefault()
    drag.current = { pid: e.pointerId, sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current
    if (!d || d.pid !== e.pointerId) return
    setPos(clampPos({ x: d.ox + (e.clientX - d.sx), y: d.oy + (e.clientY - d.sy) }))
  }

  function onUp(e: React.PointerEvent<HTMLDivElement>) {
    if (drag.current?.pid === e.pointerId) drag.current = null
  }

  function changeZoom(z: number) {
    setZoom(z)
    setPos(p => clampPos(p, z))
  }

  async function confirm() {
    const img = imgRef.current
    if (!img || !nat) return
    setBusy(true)

    const out = CATEGORY_UPLOAD_SIZE[category]
    const scale = cover * zoom            // image px → screen px
    const side = BOX / scale              // crop side in image px
    const sx = Math.max(0, Math.min(nat.w - side, nat.w / 2 - pos.x / scale - side / 2))
    const sy = Math.max(0, Math.min(nat.h - side, nat.h / 2 - pos.y / scale - side / 2))

    const canvas = document.createElement('canvas')
    canvas.width = out
    canvas.height = out
    const ctx = canvas.getContext('2d')
    if (!ctx) { setBusy(false); return }
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, sx, sy, side, side, 0, 0, out, out)

    const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/webp', 0.9))
    setBusy(false)
    if (blob) onConfirm({ blob, category })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'grid', placeItems: 'center', background: 'rgba(23,21,18,.6)', padding: 16 }}
      onClick={onCancel}>
      <div style={{ width: '100%', maxWidth: 400, background: '#fffdf9', border: '1px solid var(--line)', borderRadius: 28, padding: 22, maxHeight: '92vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20 }}>Crop & position</h3>
        <p style={{ color: 'var(--smoke)', fontSize: 12.5, marginTop: 5 }}>Drag the photo to move it, zoom to crop tighter.</p>

        <div
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          style={{
            position: 'relative', width: BOX, height: BOX, margin: '14px auto 0',
            overflow: 'hidden', borderRadius: 16, background: '#efe7d9',
            border: '1px solid var(--line)', touchAction: 'none', cursor: 'grab', userSelect: 'none',
          }}
        >
          <img
            ref={imgRef}
            src={url}
            alt=""
            draggable={false}
            onLoad={e => {
              const el = e.currentTarget
              setNat({ w: el.naturalWidth, h: el.naturalHeight })
            }}
            style={{
              position: 'absolute', left: '50%', top: '50%',
              width: dispW, height: dispH, maxWidth: 'none',
              transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px)) scale(${zoom})`,
              pointerEvents: 'none', userSelect: 'none',
            }}
          />
          {/* crop guides */}
          <span style={{ position: 'absolute', left: '33.33%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,.45)' }} />
          <span style={{ position: 'absolute', left: '66.66%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,.45)' }} />
          <span style={{ position: 'absolute', top: '33.33%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,.45)' }} />
          <span style={{ position: 'absolute', top: '66.66%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,.45)' }} />
          <span style={{ position: 'absolute', left: 8, bottom: 8, display: 'flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 999, background: 'rgba(23,21,18,.65)', color: '#fff', fontSize: 10.5, fontWeight: 600 }}>
            <Move size={11} /> Drag
          </span>
        </div>

        <label style={{ display: 'block', marginTop: 14 }}>
          <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--smoke)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><ZoomIn size={12} /> Zoom</span>
            <span style={{ color: 'var(--ink)' }}>{zoom.toFixed(1)}×</span>
          </span>
          <input type="range" min={1} max={3} step={0.05} value={zoom} onChange={e => changeZoom(Number(e.target.value))}
            style={{ width: '100%', marginTop: 6, accentColor: 'var(--ink)' }} />
        </label>

        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--smoke)', marginTop: 14 }}>Print size</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          {STICKER_GROUPS.map(g => (
            <button key={g.id} onClick={() => setCategory(g.id)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 13px', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
                border: `1px solid ${category === g.id ? 'var(--ink)' : 'var(--line)'}`,
                background: category === g.id ? 'rgba(23,21,18,.04)' : 'var(--paper)',
              }}>
              <span style={{ fontWeight: 600, fontSize: 12.5 }}>{g.label}</span>
              <span style={{ fontSize: 11, color: 'var(--smoke)' }}>{g.hint}</span>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
          <button onClick={onCancel} style={{ padding: '9px 18px', borderRadius: 999, border: '1px solid var(--line)', background: 'var(--paper)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={confirm} disabled={busy || !nat}
            style={{ padding: '9px 18px', borderRadius: 999, background: 'var(--ink)', color: '#fff', border: 0, fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: busy || !nat ? .6 : 1 }}>
            {busy ? 'Adding…' : 'Add to tee'}
          </button>
        </div>
      </div>
    </div>
  )
}
