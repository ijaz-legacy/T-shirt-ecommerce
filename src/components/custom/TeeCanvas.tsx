import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import type { PointerEvent as RPE } from 'react'
import { getSticker, parsePlacementRef, type TeeColorId } from '../../lib/catalog'
import type { StickerPlacement } from '../../lib/types'
import { TeeShape } from '../tee/TeeShape'
import { StickerArt } from '../tee/StickerArt'

const MIN_W = 8   // % of container
const MAX_W = 72
const MIN_PX = 40 // px floor so stickers are always visible

function clamp(v: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, v)) }

// ── Resize handle square ───────────────────────────────────────────────
function RH({ top, left, cursor, onDown }: {
  top: number | string; left: number | string; cursor: string
  onDown: (e: RPE<HTMLSpanElement>) => void
}) {
  return (
    <span
      onPointerDown={onDown}
      style={{
        position: 'absolute', top, left,
        width: 13, height: 13,
        background: '#fff', border: '2px solid #171512', borderRadius: 3,
        cursor, transform: 'translate(-50%,-50%)',
        boxShadow: '0 1px 5px rgba(0,0,0,.3)',
        zIndex: 30, touchAction: 'none',
      }}
    />
  )
}

export function TeeCanvas({
  colorId, placements, selectedIndex,
  onSelect, onMove, onResize, onRotate,
}: {
  colorId: TeeColorId
  placements: StickerPlacement[]
  selectedIndex: number | null
  onSelect: (i: number | null) => void
  onMove: (i: number, x: number, y: number) => void
  onResize?: (i: number, scale: number) => void
  onRotate?: (i: number, rot: number) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [cw, setCw] = useState(310)

  useLayoutEffect(() => {
    const el = containerRef.current; if (!el) return
    setCw(el.offsetWidth || 310)
    const ro = new ResizeObserver(e => { const w = e[0]?.contentRect.width; if (w) setCw(w) })
    ro.observe(el); return () => ro.disconnect()
  }, [])

  type Mode = 'move' | 'resize' | 'rotate'
  const drag = useRef<{
    mode: Mode; idx: number; pid: number
    sx: number; sy: number
    startCx: number; startCy: number; startW: number; startRot: number
    elCxPx: number; elCyPx: number
  } | null>(null)

  function startDrag(e: RPE<HTMLElement>, idx: number, mode: Mode) {
    e.preventDefault(); e.stopPropagation()
    onSelect(idx)
    const rect = containerRef.current?.getBoundingClientRect(); if (!rect) return
    const p = placements[idx]
    drag.current = {
      mode, idx, pid: e.pointerId,
      sx: e.clientX, sy: e.clientY,
      startCx: p.x, startCy: p.y, startW: p.scale, startRot: p.rotation,
      elCxPx: rect.left + (p.x / 100) * rect.width,
      elCyPx: rect.top  + (p.y / 100) * rect.height,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onPM = useCallback((e: RPE<HTMLDivElement>) => {
    const d = drag.current; if (!d || d.pid !== e.pointerId) return
    const rect = containerRef.current?.getBoundingClientRect(); if (!rect) return
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy
    if (d.mode === 'move') {
      onMove(d.idx,
        Math.round(clamp(d.startCx + (dx / rect.width)  * 100, 0, 100) * 10) / 10,
        Math.round(clamp(d.startCy + (dy / rect.height) * 100, 0, 100) * 10) / 10)
    } else if (d.mode === 'resize') {
      const dist = Math.hypot(dx, dy) * Math.sign(dx + dy)
      const pxFloor = (MIN_PX / cw) * 100
      onResize?.(d.idx, Math.round(clamp(d.startW + (dist / rect.width) * 100 * 1.8, Math.max(MIN_W, pxFloor), MAX_W) * 10) / 10)
    } else {
      const a = Math.atan2(e.clientY - d.elCyPx, e.clientX - d.elCxPx)
      const s = Math.atan2(d.sy - d.elCyPx, d.sx - d.elCxPx)
      let rot = d.startRot + ((a - s) * 180) / Math.PI
      if (rot > 180) rot -= 360; if (rot < -180) rot += 360
      onRotate?.(d.idx, Math.round(rot))
    }
  }, [onMove, onResize, onRotate, cw])

  const onPU = useCallback((e: RPE<HTMLDivElement>) => {
    if (drag.current?.pid === e.pointerId) drag.current = null
  }, [])

  return (
    <div
      ref={containerRef}
      style={{ touchAction: 'none', userSelect: 'none' }}
      onPointerMove={onPM}
      onPointerUp={onPU}
      onPointerCancel={onPU}
      onClick={e => { if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.shell) onSelect(null) }}
    >
      <TeeShape colorId={colorId}>
        {placements.map((p, idx) => {
          const parsed = parsePlacementRef(p.ref)
          const isText = p.ref.startsWith('text:')
          if (!parsed && !isText) return null

          const selected = idx === selectedIndex
          const pxFloor = (MIN_PX / cw) * 100
          const w = clamp(Math.max(p.scale, pxFloor), MIN_W, MAX_W)

          const styleOv = p.style
          const bgShape = styleOv?.bgShape ?? 'none'
          const bgColor = styleOv?.bgColor ?? '#fff'
          const userTransparent = bgShape === 'transparent'
          const isTransparent = userTransparent || (bgShape === 'none' && parsed?.type === 'image')
          const innerBg = userTransparent ? 'transparent' : bgShape !== 'none' ? bgColor : parsed?.type === 'builtin' ? getSticker(parsed.id).bg : 'transparent'
          const innerRadius = bgShape === 'circle' ? '50%' : bgShape === 'rounded' ? '20%' : bgShape === 'square' ? '4px' : parsed?.type === 'builtin' ? '50%' : '4px'

          const outer: React.CSSProperties = {
            position: 'absolute',
            left: `${p.x}%`, top: `${p.y}%`, width: `${w}%`,
            aspectRatio: '1',
            transform: `translate(-50%,-50%) rotate(${p.rotation}deg)`,
            cursor: 'grab', zIndex: selected ? 20 : 2,
            outline: selected ? '2px solid rgba(23,21,18,0.85)' : 'none',
            outlineOffset: 2, borderRadius: 4,
          }
          const inner: React.CSSProperties = {
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: isTransparent && parsed?.type === 'image' ? 0 : '10%',
            borderRadius: innerRadius, backgroundColor: innerBg,
            boxShadow: !isTransparent ? 'inset 0 0 0 1.5px rgba(255,255,255,.25), 0 6px 18px -5px rgba(23,21,18,.28)' : undefined,
          }

          const handles = selected ? (
            <>
              {/* Rotation handle */}
              <span
                onPointerDown={e => { e.stopPropagation(); startDrag(e as unknown as RPE<HTMLElement>, idx, 'rotate') }}
                style={{ position: 'absolute', top: -26, left: '50%', transform: 'translateX(-50%)', width: 14, height: 14, background: '#C8542F', border: '2.5px solid #fff', borderRadius: '50%', cursor: 'alias', zIndex: 40, boxShadow: '0 2px 6px rgba(200,84,47,.5)', touchAction: 'none' }}
              />
              <span style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', width: 1, height: 14, background: 'rgba(23,21,18,.35)', pointerEvents: 'none' }} />
              {/* Corner handles */}
              <RH top={0}     left={0}     cursor="nw-resize" onDown={e => { e.stopPropagation(); startDrag(e as unknown as RPE<HTMLElement>, idx, 'resize') }} />
              <RH top={0}     left="100%"  cursor="ne-resize" onDown={e => { e.stopPropagation(); startDrag(e as unknown as RPE<HTMLElement>, idx, 'resize') }} />
              <RH top="100%" left={0}     cursor="sw-resize" onDown={e => { e.stopPropagation(); startDrag(e as unknown as RPE<HTMLElement>, idx, 'resize') }} />
              <RH top="100%" left="100%"  cursor="se-resize" onDown={e => { e.stopPropagation(); startDrag(e as unknown as RPE<HTMLElement>, idx, 'resize') }} />
              <RH top="50%"  left={0}     cursor="w-resize"  onDown={e => { e.stopPropagation(); startDrag(e as unknown as RPE<HTMLElement>, idx, 'resize') }} />
              <RH top="50%"  left="100%"  cursor="e-resize"  onDown={e => { e.stopPropagation(); startDrag(e as unknown as RPE<HTMLElement>, idx, 'resize') }} />
            </>
          ) : null

          if (isText && p.text) {
            const ff = p.text.fontFamily === 'serif' ? "'Instrument Serif',Georgia,serif" : p.text.fontFamily === 'display' ? "'Bricolage Grotesque',sans-serif" : p.text.fontFamily === 'mono' ? 'monospace' : "'DM Sans',sans-serif"
            return (
              <div key={`t-${idx}`} style={outer} onPointerDown={e => startDrag(e, idx, 'move')}>
                <div style={{ ...inner, padding: '4%' }}>
                  <span style={{ fontFamily: ff, color: p.text.color, fontWeight: p.text.bold ? 700 : 400, fontStyle: p.text.italic ? 'italic' : 'normal', fontSize: 'clamp(8px,18%,48px)', textAlign: 'center', lineHeight: 1.2, whiteSpace: 'pre-wrap', wordBreak: 'break-word', pointerEvents: 'none', userSelect: 'none' }}>
                    {p.text.content}
                  </span>
                </div>
                {handles}
              </div>
            )
          }

          if (!parsed) return null

          return (
            <div key={`e-${idx}`} style={outer} onPointerDown={e => startDrag(e, idx, 'move')}>
              <div style={inner}>
                {parsed.type === 'image'
                  ? <img src={p.ref} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none', display: 'block' }} draggable={false} />
                  : <StickerArt sticker={getSticker(parsed.id as Parameters<typeof getSticker>[0])} fgOverride={styleOv?.fg} accentOverride={styleOv?.accent} />
                }
              </div>
              {handles}
            </div>
          )
        })}
      </TeeShape>
    </div>
  )
}
