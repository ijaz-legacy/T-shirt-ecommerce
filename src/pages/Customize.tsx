import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Trash2, Type, Upload, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useLang } from '../context/LangContext'
import { TeeCanvas } from '../components/custom/TeeCanvas'
import { StickerArt } from '../components/tee/StickerArt'
import { supabase } from '../lib/supabase'
import {
  FITS, SIZES, STICKERS, TEE_COLORS,
  calcCustomUnitPrice, getFit, getTeeColor, parsePlacementRef, getSticker,
  type FitId, type Size, type TeeColorId, type StickerCategory,
} from '../lib/catalog'
import type { StickerPlacement } from '../lib/types'
import { formatINR } from '../lib/currency'

type Step = 1 | 2 | 3 | 4

interface ApiSticker { id: string; name_en: string; name_ta: string; image_url: string; category: string }

function uid() { return Math.random().toString(36).slice(2) }

const SPOTS = [{ x: 50, y: 38 }, { x: 37, y: 52 }, { x: 63, y: 52 }]

export default function Customize() {
  const { user } = useAuth()
  const { addCustom } = useCart()
  const { lang } = useLang()
  const navigate = useNavigate()

  const [step, setStep]           = useState<Step>(1)
  const [maxStep, setMaxStep]     = useState<Step>(1)
  const [fitId, setFitId]         = useState<FitId>('regular')
  const [size, setSize]           = useState<Size | null>(null)
  const [colorId, setColorId]     = useState<TeeColorId>('cream')
  const [placements, setPlacements] = useState<StickerPlacement[]>([])
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [qty, setQty]             = useState(1)
  const [stepError, setStepError] = useState<string | null>(null)
  const [dbStickers, setDbStickers] = useState<ApiSticker[]>([])
  const [uploading, setUploading] = useState(false)
  const [showTextModal, setShowTextModal] = useState(false)
  const [textDraft, setTextDraft] = useState('')
  const [sizeModal, setSizeModal] = useState<{ file: File } | null>(null)

  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.from('stickers').select('*').eq('active', true).order('sort_order')
      .then(({ data }) => { if (data) setDbStickers(data) })
  }, [])

  const fit       = getFit(fitId)
  const color     = getTeeColor(colorId)
  const scales    = placements.map(p => p.scale)
  const unitPrice = calcCustomUnitPrice(fitId, scales)
  const total     = unitPrice * qty
  const sel       = selectedIdx !== null ? placements[selectedIdx] : null

  // ── navigation ────────────────────────────────────────────────────
  function goStep(n: Step) { setStep(n); setStepError(null) }
  function next() {
    if (step === 1 && !size) { setStepError('Please choose a size.'); return }
    if (step === 3 && placements.length === 0) { setStepError('Add at least one sticker.'); return }
    const n = (step + 1) as Step
    setStep(n); setMaxStep(c => n > c ? n : c); setStepError(null)
  }
  function back() { if (step > 1) goStep((step - 1) as Step) }

  // ── placements ────────────────────────────────────────────────────
  function addPlacement(ref: string, cat: StickerCategory = 'medium') {
    if (placements.length >= 10) { setStepError('Maximum 10 items.'); return }
    const spot = SPOTS[placements.length % SPOTS.length]
    const scale = cat === 'small' ? 16 : cat === 'large' ? 55 : 32
    setPlacements(c => [...c, { ref, x: spot.x, y: spot.y, scale, rotation: 0 }])
    setSelectedIdx(placements.length)
    setStepError(null)
  }

  function toggleBuiltin(ref: string) {
    const i = placements.findIndex(p => p.ref === ref)
    if (i >= 0) { setPlacements(c => c.filter((_, j) => j !== i)); if (selectedIdx === i) setSelectedIdx(null) }
    else addPlacement(ref, 'small')
  }

  function updateP(idx: number, patch: Partial<StickerPlacement>) {
    setPlacements(c => c.map((p, i) => i === idx ? { ...p, ...patch } : p))
  }

  function removeP(idx: number) {
    setPlacements(c => c.filter((_, i) => i !== idx))
    setSelectedIdx(null)
  }

  // ── text add ──────────────────────────────────────────────────────
  function handleAddText() {
    if (!textDraft.trim()) return
    addPlacement(`text:${uid()}`, 'medium')
    const newIdx = placements.length
    setPlacements(c => c.map((p, i) => i === newIdx ? { ...p, text: { content: textDraft.trim(), fontFamily: 'sans', color: '#171512', bold: false, italic: false } } : p))
    setTextDraft(''); setShowTextModal(false)
  }

  // ── image upload ──────────────────────────────────────────────────
  async function handleUpload(file: File, cat: StickerCategory) {
    if (!user) return
    setUploading(true); setSizeModal(null)
    const path = `uploads/${user.id}/${uid()}.png`
    const { error } = await supabase.storage.from('images').upload(path, file, { contentType: file.type, upsert: false })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(path)
      addPlacement(publicUrl, cat)
    } else {
      setStepError('Upload failed. Please try again.')
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  // ── cart ──────────────────────────────────────────────────────────
  function handleAddToCart() {
    if (!size) { setStep(1); setStepError('Please choose a size.'); return }
    addCustom({ fit: fitId, size, colorId, placements }, qty)
    navigate('/cart')
  }

  const stepLabels = ['Fit & size', 'Colour', 'Design', 'Review']

  // ── pricing helpers ───────────────────────────────────────────────
  function priceFor(scale: number) { return scale > 48 ? 100 : 59 }
  const designTotal = scales.reduce((s, sc) => s + priceFor(sc), 0)

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '28px 16px 60px' }}>
      {/* Text modal */}
      {showTextModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'grid', placeItems: 'center', background: 'rgba(23,21,18,.55)' }}
          onClick={() => setShowTextModal(false)}>
          <div style={{ width: '100%', maxWidth: 420, background: '#fffdf9', border: '1px solid var(--line)', borderRadius: 28, padding: 24 }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20 }}>Add text to your tee</h3>
            <p style={{ color: 'var(--smoke)', fontSize: 13, marginTop: 6 }}>Your name, a word, anything — up to 120 characters.</p>
            <textarea rows={3} value={textDraft} onChange={e => setTextDraft(e.target.value)} maxLength={120} placeholder="e.g. Vijay · Chennai · 2025"
              style={{ display: 'block', width: '100%', marginTop: 14, padding: '10px 13px', border: '1px solid var(--line)', borderRadius: 12, fontSize: 14, resize: 'none', background: 'var(--shell)' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
              <button onClick={() => setShowTextModal(false)} style={{ padding: '9px 18px', borderRadius: 999, border: '1px solid var(--line)', background: 'var(--paper)', fontWeight: 600, fontSize: 13 }}>Cancel</button>
              <button onClick={handleAddText} disabled={!textDraft.trim()} style={{ padding: '9px 18px', borderRadius: 999, background: 'var(--ink)', color: '#fff', border: 0, fontWeight: 600, fontSize: 13 }}>
                <Type size={13} style={{ display: 'inline', marginRight: 5 }} />Add text
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Size category modal */}
      {sizeModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'grid', placeItems: 'center', background: 'rgba(23,21,18,.55)' }}
          onClick={() => setSizeModal(null)}>
          <div style={{ width: '100%', maxWidth: 380, background: '#fffdf9', border: '1px solid var(--line)', borderRadius: 28, padding: 24 }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18 }}>How big is this image?</h3>
            <p style={{ color: 'var(--smoke)', fontSize: 13, marginTop: 6 }}>Choose how it will be printed.</p>
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {([
                { cat: 'small',  label: 'Small — Logo / Icon',        hint: 'Best for logos, icons, small symbols' },
                { cat: 'medium', label: 'Medium — Half-sheet',         hint: 'Names, text or half-page images' },
                { cat: 'large',  label: 'Large — Full A4 sheet',       hint: 'Large statement prints' },
              ] as { cat: StickerCategory; label: string; hint: string }[]).map(({ cat, label, hint }) => (
                <button key={cat} onClick={() => handleUpload(sizeModal.file, cat)}
                  style={{ padding: '12px 14px', borderRadius: 16, border: '1px solid var(--line)', background: 'var(--paper)', textAlign: 'left', cursor: 'pointer' }}>
                  <p style={{ fontWeight: 600, fontSize: 13 }}>{label}</p>
                  <p style={{ color: 'var(--smoke)', fontSize: 11.5, marginTop: 3 }}>{hint}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 24, alignItems: 'start' }}>

        {/* ── Left: shirt preview ─────────────────────────────────── */}
        <div style={{ position: 'sticky', top: 24 }}>
          <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 24, padding: 16 }}>
            <div style={{ maxWidth: 310, margin: '0 auto' }}>
              <TeeCanvas
                colorId={colorId}
                placements={placements}
                selectedIndex={selectedIdx}
                onSelect={setSelectedIdx}
                onMove={(i, x, y) => updateP(i, { x, y })}
                onResize={(i, scale) => updateP(i, { scale })}
                onRotate={(i, rotation) => updateP(i, { rotation })}
              />
            </div>

            {/* Chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 12 }}>
              {[
                lang === 'ta' ? fit.nameTa : fit.nameEn,
                size ?? '—',
                lang === 'ta' ? color.nameTa : color.nameEn,
                placements.length > 0 ? `${placements.length} item${placements.length > 1 ? 's' : ''}` : null,
              ].filter(Boolean).map((chip, i) => (
                <span key={i} style={{ border: '1px solid var(--line)', borderRadius: 999, padding: '4px 12px', fontSize: 11.5, fontWeight: 600, color: 'var(--smoke)', background: 'var(--paper)' }}>
                  {chip}
                </span>
              ))}
            </div>

            {/* Hint */}
            {step === 3 && (
              <p style={{ textAlign: 'center', fontSize: 10.5, color: 'var(--smoke)', marginTop: 8 }}>
                Drag stickers · Corner handles to resize · Red ◯ to rotate
              </p>
            )}

            {/* Total */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--line)', marginTop: 12, paddingTop: 12 }}>
              <span style={{ fontSize: 12, color: 'var(--smoke)' }}>Total</span>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18 }}>{formatINR(total)}</span>
            </div>
          </div>

          {/* Selected element editor */}
          {step === 3 && sel !== null && selectedIdx !== null && (
            <PlacementPanel
              placement={sel}
              index={selectedIdx}
              onChange={updateP}
              onRemove={removeP}
            />
          )}
        </div>

        {/* ── Right: step wizard ─────────────────────────────────── */}
        <div>
          {/* Step tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
            {stepLabels.map((label, i) => {
              const v = (i + 1) as Step
              const isActive = v === step
              const isDone = v < maxStep
              const reachable = v <= maxStep
              return (
                <button key={v} onClick={() => reachable && goStep(v)} disabled={!reachable}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, background: 'none', border: 0, cursor: reachable ? 'pointer' : 'default', padding: 0 }}>
                  <span style={{
                    width: 32, height: 32, borderRadius: '50%', display: 'grid', placeItems: 'center',
                    fontSize: 11, fontWeight: 700,
                    background: isActive ? 'var(--ink)' : isDone ? 'var(--paper)' : 'var(--shell)',
                    color: isActive ? 'var(--paper)' : isDone ? 'var(--ink)' : 'var(--smoke)',
                    border: isActive ? '1px solid var(--ink)' : '1px solid var(--line)',
                  }}>
                    {isDone && !isActive ? '✓' : v}
                  </span>
                  <span style={{ fontSize: 9.5, fontWeight: 500, color: isActive ? 'var(--ink)' : 'var(--smoke)', textAlign: 'center' }}>
                    {label}
                  </span>
                </button>
              )
            })}
          </div>

          <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 24, padding: 22 }}>

            {/* ── Step 1: Fit & Size ──────────────────────────────── */}
            {step === 1 && (
              <>
                <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22 }}>Choose your fit</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
                  {FITS.map(f => (
                    <button key={f.id} onClick={() => setFitId(f.id)}
                      style={{ padding: 14, borderRadius: 16, border: `1px solid ${fitId === f.id ? 'var(--ink)' : 'var(--line)'}`, background: fitId === f.id ? 'rgba(23,21,18,.03)' : 'var(--paper)', textAlign: 'left', cursor: 'pointer', outline: fitId === f.id ? '1px solid var(--ink)' : 'none', outlineOffset: -1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 600, fontSize: 13.5 }}>{lang === 'ta' ? f.nameTa : f.nameEn}</span>
                        <span style={{ fontWeight: 700, fontSize: 13 }}>{formatINR(f.price)}</span>
                      </div>
                      <p style={{ color: 'var(--smoke)', fontSize: 11.5, marginTop: 4 }}>{lang === 'ta' ? f.descTa : f.descEn}</p>
                    </button>
                  ))}
                </div>

                <h3 style={{ fontWeight: 700, fontSize: 14, marginTop: 20, marginBottom: 10 }}>Choose your size</h3>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {SIZES.map(s => (
                    <button key={s} onClick={() => { setSize(s); setStepError(null) }}
                      style={{ minWidth: 46, padding: '9px 13px', borderRadius: 11, border: '1px solid var(--line)', background: size === s ? 'var(--ink)' : 'var(--paper)', color: size === s ? 'var(--paper)' : 'var(--ink)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                      {s}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* ── Step 2: Colour ─────────────────────────────────── */}
            {step === 2 && (
              <>
                <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22 }}>Pick a colour</h2>
                <p style={{ color: 'var(--smoke)', fontSize: 13, marginTop: 6 }}>All colours are 100% combed cotton.</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginTop: 16 }}>
                  {TEE_COLORS.map(c => (
                    <button key={c.id} onClick={() => setColorId(c.id)}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 10, borderRadius: 16, border: `1px solid ${colorId === c.id ? 'var(--ink)' : 'var(--line)'}`, background: colorId === c.id ? 'rgba(23,21,18,.03)' : 'var(--paper)', cursor: 'pointer', outline: colorId === c.id ? '1px solid var(--ink)' : 'none', outlineOffset: -1 }}>
                      <span style={{ width: 40, height: 40, borderRadius: '50%', background: c.hex, border: '1px solid var(--line)', display: 'grid', placeItems: 'center' }}>
                        {colorId === c.id && <Check size={16} color={c.tone === 'dark' ? '#fff' : '#171512'} />}
                      </span>
                      <span style={{ fontSize: 10.5, fontWeight: 500 }}>{lang === 'ta' ? c.nameTa : c.nameEn}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* ── Step 3: Design ─────────────────────────────────── */}
            {step === 3 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22 }}>Add your design</h2>
                  {placements.length > 0 && (
                    <button onClick={() => { setPlacements([]); setSelectedIdx(null) }}
                      style={{ fontSize: 12, color: 'var(--smoke)', background: 'none', border: 0, textDecoration: 'underline', cursor: 'pointer' }}>
                      Clear all
                    </button>
                  )}
                </div>
                <p style={{ color: 'var(--smoke)', fontSize: 12.5, marginTop: 6 }}>
                  Tap to add · Small ₹59 · Full A4 ₹100
                </p>

                {/* Built-in stickers */}
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--smoke)', marginTop: 16, marginBottom: 8 }}>Sticker library</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                  {STICKERS.map(s => {
                    const ref = `builtin:${s.id}`
                    const placed = placements.some(p => p.ref === ref)
                    return (
                      <button key={s.id} onClick={() => toggleBuiltin(ref)}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: 8, borderRadius: 14, border: `1px solid ${placed ? 'var(--ink)' : 'var(--line)'}`, background: placed ? 'rgba(23,21,18,.03)' : 'var(--paper)', cursor: 'pointer', position: 'relative', outline: placed ? '1px solid var(--ink)' : 'none', outlineOffset: -1 }}>
                        <span style={{ width: '100%', aspectRatio: '1', background: s.bg, borderRadius: 10, display: 'grid', placeItems: 'center', padding: '12%' }}>
                          <StickerArt sticker={s} />
                        </span>
                        <span style={{ fontSize: 9.5, fontWeight: 600, textAlign: 'center', lineHeight: 1.2 }}>
                          {lang === 'ta' ? s.nameTa : s.nameEn}
                        </span>
                        {placed && <span style={{ position: 'absolute', top: 5, right: 5, width: 16, height: 16, background: 'var(--ink)', borderRadius: '50%', display: 'grid', placeItems: 'center' }}><Check size={10} color="#fff" /></span>}
                      </button>
                    )
                  })}
                </div>

                {/* DB stickers */}
                {dbStickers.length > 0 && (
                  <>
                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--smoke)', marginTop: 18, marginBottom: 8 }}>Custom stickers</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                      {dbStickers.map(s => {
                        const placed = placements.some(p => p.ref === s.image_url)
                        return (
                          <button key={s.id} onClick={() => { const i = placements.findIndex(p => p.ref === s.image_url); if (i >= 0) { setPlacements(c => c.filter((_, j) => j !== i)); if (selectedIdx === i) setSelectedIdx(null) } else addPlacement(s.image_url, s.category as StickerCategory) }}
                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: 8, borderRadius: 14, border: `1px solid ${placed ? 'var(--ink)' : 'var(--line)'}`, background: placed ? 'rgba(23,21,18,.03)' : 'var(--paper)', cursor: 'pointer', position: 'relative' }}>
                            <span style={{ width: '100%', aspectRatio: '1', background: 'var(--shell)', borderRadius: 10, overflow: 'hidden', display: 'grid', placeItems: 'center', padding: 4 }}>
                              <img src={s.image_url} alt={s.name_en} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            </span>
                            <span style={{ fontSize: 9.5, fontWeight: 600 }}>{lang === 'ta' ? s.name_en : s.name_en}</span>
                            {placed && <span style={{ position: 'absolute', top: 5, right: 5, width: 16, height: 16, background: 'var(--ink)', borderRadius: '50%', display: 'grid', placeItems: 'center' }}><Check size={10} color="#fff" /></span>}
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}

                {/* Add text */}
                <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--shell)', borderRadius: 14, border: '1px solid var(--line)' }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 13 }}>Add text to your tee</p>
                    <p style={{ color: 'var(--smoke)', fontSize: 11.5 }}>Name, word, or anything you like</p>
                  </div>
                  <button onClick={() => setShowTextModal(true)} disabled={placements.length >= 10}
                    style={{ padding: '7px 14px', borderRadius: 999, background: 'var(--ink)', color: '#fff', border: 0, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                    + Add
                  </button>
                </div>

                {/* Upload image */}
                <div style={{ marginTop: 10, padding: '12px 14px', background: 'var(--shell)', borderRadius: 14, border: '1px dashed var(--line)' }}>
                  {user ? (
                    <>
                      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }}
                        onChange={e => { const f = e.target.files?.[0]; if (f) setSizeModal({ file: f }) }} />
                      <button onClick={() => fileRef.current?.click()} disabled={uploading}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 999, border: '1px solid var(--line)', background: 'var(--paper)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                        {uploading ? <><span style={{ width: 14, height: 14, border: '2px solid var(--ink)', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.6s linear infinite' }} />Uploading…</> : <><Upload size={13} />Upload your image</>}
                      </button>
                      <p style={{ color: 'var(--smoke)', fontSize: 11, marginTop: 6 }}>PNG, JPG, WebP · Background removed automatically</p>
                    </>
                  ) : (
                    <p style={{ fontSize: 12, color: 'var(--smoke)' }}>
                      <a href="/login?next=/customize" style={{ color: 'var(--rust)', fontWeight: 600 }}>Sign in</a> to upload your own image.
                    </p>
                  )}
                </div>
              </>
            )}

            {/* ── Step 4: Review ─────────────────────────────────── */}
            {step === 4 && (
              <>
                <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22 }}>Your tee, your way.</h2>
                <p style={{ color: 'var(--smoke)', fontSize: 13, marginTop: 6 }}>One last look before you add it to your bag.</p>

                <div style={{ marginTop: 16, border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden' }}>
                  {[
                    ['Fit', lang === 'ta' ? fit.nameTa : fit.nameEn],
                    ['Size', size ?? '—'],
                    ['Colour', lang === 'ta' ? color.nameTa : color.nameEn],
                    ['Tee price', formatINR(fit.price)],
                    ['Print price', `+${formatINR(designTotal)}`],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 16px', borderBottom: '1px solid var(--line)', fontSize: 13 }}>
                      <span style={{ color: 'var(--smoke)' }}>{k}</span>
                      <span style={{ fontWeight: 600 }}>{v}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '13px 16px', fontSize: 15, fontWeight: 700 }}>
                    <span>Total (× {qty})</span>
                    <span>{formatINR(unitPrice * qty)}</span>
                  </div>
                </div>

                {/* Qty */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Quantity</span>
                  <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid var(--line)', background: 'var(--paper)', fontWeight: 700, cursor: 'pointer' }}>−</button>
                  <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 600 }}>{qty}</span>
                  <button onClick={() => setQty(q => Math.min(10, q + 1))} style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid var(--line)', background: 'var(--paper)', fontWeight: 700, cursor: 'pointer' }}>+</button>
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
                  <button onClick={handleAddToCart} style={{ flex: 1, padding: '13px', borderRadius: 999, background: 'var(--ink)', color: '#fff', border: 0, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                    Add to bag
                  </button>
                  <button onClick={() => { handleAddToCart(); navigate('/checkout') }} style={{ flex: 1, padding: '13px', borderRadius: 999, background: 'var(--rust)', color: '#fff', border: 0, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                    Buy now
                  </button>
                </div>
              </>
            )}

            {/* Error */}
            {stepError && <p style={{ color: 'var(--rust)', fontSize: 12.5, marginTop: 12 }}>{stepError}</p>}

            {/* Nav buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
              {step > 1
                ? <button onClick={back} style={{ padding: '9px 18px', borderRadius: 999, border: '1px solid var(--line)', background: 'var(--paper)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>← Back</button>
                : <span />
              }
              {step < 4 && (
                <button onClick={next} style={{ padding: '9px 20px', borderRadius: 999, background: 'var(--ink)', color: '#fff', border: 0, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  Continue →
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

// ── Inline placement editor panel ─────────────────────────────────────
function PlacementPanel({ placement, index, onChange, onRemove }: {
  placement: StickerPlacement
  index: number
  onChange: (i: number, patch: Partial<StickerPlacement>) => void
  onRemove: (i: number) => void
}) {
  const parsed = parsePlacementRef(placement.ref)
  const isText = placement.ref.startsWith('text:')
  const sticker = parsed?.type === 'builtin' ? getSticker(parsed.id) : null
  const styleOv = placement.style ?? { bgShape: 'transparent' as const, bgColor: '#FFFFFF' }
  const bgShape = styleOv.bgShape ?? 'transparent'
  const bgColor = styleOv.bgColor ?? '#FFFFFF'

  function ps(patch: Partial<NonNullable<StickerPlacement['style']>>) {
    onChange(index, { style: { ...styleOv, ...patch } })
  }
  function pt(patch: Partial<NonNullable<StickerPlacement['text']>>) {
    onChange(index, { text: { ...(placement.text ?? { content: '', fontFamily: 'sans', color: '#171512', bold: false, italic: false }), ...patch } })
  }

  const COLORS = ['#FFFFFF','#F7F2E9','#171512','#C8542F','#E9B44C','#59634C','#26374F','#6C2E38','#A9C3D6','#D8C2A4','#F0CBD2','#EAD8B7','#FF6B6B','#4ECDC4','#45B7D1','#96CEB4']

  return (
    <div style={{ marginTop: 12, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 20, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontWeight: 600, fontSize: 13 }}>
          {isText ? `"${placement.text?.content?.slice(0, 20) ?? 'Text'}"` : sticker ? sticker.nameEn : 'Image'}
        </p>
        <button onClick={() => onRemove(index)} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: 'var(--smoke)', background: 'none', border: 0, cursor: 'pointer' }}>
          <Trash2 size={12} /> Remove
        </button>
      </div>

      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Text controls */}
        {isText && (
          <>
            <textarea rows={2} value={placement.text?.content ?? ''} onChange={e => pt({ content: e.target.value })} maxLength={120}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 10, fontSize: 13, resize: 'none' }} />
            <div style={{ display: 'flex', gap: 6 }}>
              {(['sans','display','serif','mono'] as const).map(f => (
                <button key={f} onClick={() => pt({ fontFamily: f })}
                  style={{ flex: 1, padding: '6px', borderRadius: 8, border: `1px solid ${placement.text?.fontFamily === f ? 'var(--ink)' : 'var(--line)'}`, background: placement.text?.fontFamily === f ? 'var(--ink)' : 'var(--paper)', color: placement.text?.fontFamily === f ? '#fff' : 'var(--smoke)', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
                  {f === 'sans' ? 'Clean' : f === 'display' ? 'Bold' : f === 'serif' ? 'Serif' : 'Mono'}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[['B', 'bold'] as const, ['I', 'italic'] as const].map(([label, key]) => (
                <button key={key} onClick={() => pt({ [key]: !placement.text?.[key] })}
                  style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid var(--line)', background: placement.text?.[key] ? 'var(--ink)' : 'var(--paper)', color: placement.text?.[key] ? '#fff' : 'var(--smoke)', fontWeight: key === 'bold' ? 700 : 400, fontStyle: key === 'italic' ? 'italic' : 'normal', fontSize: 14, cursor: 'pointer' }}>
                  {label}
                </button>
              ))}
            </div>
            <ColorPicker label="Text colour" value={placement.text?.color ?? '#171512'} onChange={c => pt({ color: c })} colors={COLORS} />
          </>
        )}

        {/* Sticker colours */}
        {sticker && (
          <>
            <ColorPicker label="Main colour" value={styleOv.fg ?? sticker.fg} onChange={c => ps({ fg: c })} colors={COLORS} />
            <ColorPicker label="Accent colour" value={styleOv.accent ?? sticker.accent} onChange={c => ps({ accent: c })} colors={COLORS} />
          </>
        )}

        {/* Background shape */}
        {!isText && (
          <div>
            <p style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--smoke)', marginBottom: 7 }}>Background</p>
            <div style={{ display: 'flex', gap: 6 }}>
              {([['transparent','None'],['circle','Circle'],['rounded','Rounded'],['square','Square']] as const).map(([id, label]) => (
                <button key={id} onClick={() => ps({ bgShape: id })}
                  style={{ flex: 1, padding: '7px 4px', borderRadius: 10, border: `1px solid ${bgShape === id ? 'var(--ink)' : 'var(--line)'}`, background: bgShape === id ? 'rgba(23,21,18,.05)' : 'var(--paper)', fontSize: 10, fontWeight: 600, cursor: 'pointer', outline: bgShape === id ? '1px solid var(--ink)' : 'none', outlineOffset: -1 }}>
                  {label}
                </button>
              ))}
            </div>
            {bgShape !== 'transparent' && (
              <ColorPicker label="Background colour" value={bgColor} onChange={c => ps({ bgColor: c })} colors={COLORS} />
            )}
          </div>
        )}

        {/* Size + rotation */}
        <Slider label="Size" value={placement.scale} min={8} max={72} unit="%" onChange={v => onChange(index, { scale: v })} />
        <Slider label="Rotate" value={placement.rotation} min={-180} max={180} unit="°" onChange={v => onChange(index, { rotation: v })} />
      </div>
    </div>
  )
}

function ColorPicker({ label, value, onChange, colors }: { label: string; value: string; onChange: (c: string) => void; colors: string[] }) {
  return (
    <div>
      <p style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--smoke)', marginBottom: 7 }}>{label}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {colors.map(c => (
          <button key={c} onClick={() => onChange(c)} title={c}
            style={{ width: 22, height: 22, borderRadius: '50%', background: c, border: `2px solid ${value.toLowerCase() === c.toLowerCase() ? 'var(--ink)' : 'var(--line)'}`, cursor: 'pointer', transform: value.toLowerCase() === c.toLowerCase() ? 'scale(1.2)' : 'none' }} />
        ))}
        <label style={{ width: 22, height: 22, borderRadius: '50%', border: '2px dashed var(--smoke)', cursor: 'pointer', display: 'grid', placeItems: 'center', fontSize: 10 }}>
          +<input type="color" value={value} onChange={e => onChange(e.target.value)} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
        </label>
      </div>
    </div>
  )
}

function Slider({ label, value, min, max, unit, onChange }: { label: string; value: number; min: number; max: number; unit: string; onChange: (v: number) => void }) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, fontWeight: 600, color: 'var(--smoke)', marginBottom: 4 }}>
        <span style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
        <span style={{ color: 'var(--ink)' }}>{Math.round(value)}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={1} value={value} onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--ink)' }} />
    </label>
  )
}
