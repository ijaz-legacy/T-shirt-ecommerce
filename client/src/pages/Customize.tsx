import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Bookmark, Check, Crop, Move, RotateCcw, Shirt, Trash2, Type, Upload, ZoomIn, ZoomOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useLang } from '../context/LangContext'
import { Tee3DPreview, type TeeSide } from '../components/three/Tee3DPreview'
import { CropModal, type CropResult } from '../components/custom/CropModal'
import { supabase } from '../lib/supabase'
import {
  FITS, SIZES, TEE_COLORS,
  calcCustomUnitPrice, getFit, getTeeColor, parsePlacementRef, getSticker,
  priceForScale, getCategoryFromScale,
  CUSTOM_PRICE_SMALL, CUSTOM_PRICE_MEDIUM, CUSTOM_PRICE_LARGE,
  type FitId, type Size, type TeeColorId, type StickerCategory,
} from '../lib/catalog'
import { STICKER_GROUPS, isStickerRef, toLibraryStickers } from '../lib/stickerLibrary'
import type { CustomConfig, StickerPlacement } from '../lib/types'
import { formatINR } from '../lib/currency'
import { listDesigns, saveDesign } from '../lib/designs'

interface ApiSticker { id: string; name_en: string; name_ta: string; image_url: string; category: string }

function uid() { return Math.random().toString(36).slice(2) }

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise(resolve => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(String(reader.result))
    reader.readAsDataURL(blob)
  })
}

const SPOTS = [{ x: 50, y: 38 }, { x: 37, y: 52 }, { x: 63, y: 52 }]

export default function Customize() {
  const { user, loading: authLoading } = useAuth()
  const { addCustom } = useCart()
  const { lang } = useLang()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const designParam = params.get('design')

  const [fitId, setFitId]         = useState<FitId>('regular')
  const [size, setSize]           = useState<Size>('M')
  const [colorId, setColorId]     = useState<TeeColorId>('cream')
  const [placements, setPlacements] = useState<StickerPlacement[]>([])
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [qty, setQty]             = useState(1)
  const [notice, setNotice]       = useState<string | null>(null)
  const [dbStickers, setDbStickers] = useState<ApiSticker[]>([])
  const [uploading, setUploading] = useState(false)
  const [showTextModal, setShowTextModal] = useState(false)
  const [textDraft, setTextDraft] = useState('')
  const [cropFile, setCropFile]     = useState<File | null>(null)
  const [stickerCat, setStickerCat] = useState<StickerCategory>('small')
  const [uploadNote, setUploadNote] = useState<string | null>(null)
  const [saveOpen, setSaveOpen]     = useState(false)
  const [designName, setDesignName] = useState('')
  const [saveMsg, setSaveMsg]       = useState<string | null>(null)
  const [saving, setSaving]         = useState(false)
  const [designLoaded, setDesignLoaded] = useState(false)
  // Which face of the tee is being designed (stickers stick to the side you see).
  const [side, setSide] = useState<TeeSide>('front')

  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.from('stickers').select('*').eq('active', true).order('sort_order')
      .then(({ data }) => { if (data) setDbStickers(data) })
  }, [])

  // The studio is account-only — designs are saved to your profile.
  useEffect(() => {
    if (!authLoading && !user) navigate('/login?next=/customize', { replace: true })
  }, [authLoading, user, navigate])

  // Deep link from "Your designs" → reopen that design in the studio.
  useEffect(() => {
    if (!designParam || !user || designLoaded) return
    let cancelled = false
    listDesigns(user.id).then(({ designs }) => {
      if (cancelled) return
      const d = designs.find(x => x.id === designParam)
      if (d) {
        setFitId(d.fit)
        setSize(d.size)
        setColorId(d.colorId)
        setPlacements(d.placements ?? [])
        setSelectedIdx(null)
        setDesignName(d.name)
      }
      setDesignLoaded(true)
    })
    return () => { cancelled = true }
  }, [designParam, user, designLoaded])

  const fit       = getFit(fitId)
  const color     = getTeeColor(colorId)
  const scales    = placements.map(p => p.scale)
  const unitPrice = calcCustomUnitPrice(fitId, scales)
  const total     = unitPrice * qty
  const sel       = selectedIdx !== null ? placements[selectedIdx] : null
  // Sticker artwork comes from the database only (Admin → Stickers).
  const libraryStickers = toLibraryStickers(dbStickers)

  // ── placements ────────────────────────────────────────────────────
  function addPlacement(ref: string, cat: StickerCategory = 'medium') {
    if (placements.length >= 10) { setNotice('Maximum 10 items per tee.'); return }
    const spot = SPOTS[placements.length % SPOTS.length]
    const scale = cat === 'small' ? 16 : cat === 'large' ? 55 : 32
    // Stays in the 3D preview: the sticker is projected straight onto the real
    // garment — on whichever face of the tee is showing — and dragged there.
    setPlacements(c => [...c, { id: uid(), ref, x: spot.x, y: spot.y, scale, rotation: 0, side }])
    setSelectedIdx(placements.length)
    setNotice(null)
  }

  /** Stickers are tracked per face, so the same artwork can sit front and back. */
  const sideOf = (p: StickerPlacement) => p.side ?? 'front'

  /** Turning the tee to the other face also drops a selection left behind on it. */
  function changeSide(next: TeeSide) {
    setSide(next)
    setSelectedIdx(i => (i !== null && placements[i] && sideOf(placements[i]) !== next ? null : i))
  }

  function toggleSticker(ref: string, cat: StickerCategory) {
    const i = placements.findIndex(p => p.ref === ref && sideOf(p) === side)
    if (i >= 0) { setPlacements(c => c.filter((_, j) => j !== i)); if (selectedIdx === i) setSelectedIdx(null) }
    else addPlacement(ref, cat)
  }

  function updateP(idx: number, patch: Partial<StickerPlacement>) {
    setPlacements(c => c.map((p, i) => {
      if (i !== idx) return p
      const next = { ...p, ...patch }
      // Moving in the flat editor invalidates a 3D anchor; the viewer then
      // re-projects the new x/y onto the front of the shirt.
      if (!patch.decal && (patch.x !== undefined || patch.y !== undefined)) delete next.decal
      return next
    }))
  }

  function removeP(idx: number) {
    setPlacements(c => c.filter((_, i) => i !== idx))
    setSelectedIdx(null)
  }

  function clearAll() {
    setPlacements([])
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

  // ── image upload: cropped in the browser, then stored ──────────────
  async function handleCropConfirm({ blob, category }: CropResult) {
    if (!user) return
    setCropFile(null)
    setUploading(true)

    const path = `uploads/${user.id}/${uid()}.webp`
    const { error } = await supabase.storage
      .from('images')
      .upload(path, blob, { contentType: 'image/webp', upsert: false })

    if (error) {
      // The bucket's storage policy blocks uploads — keep the image inside
      // the design so the customer's print still works.
      setUploadNote('Image kept inside this design (Supabase storage policy blocks uploads).')
      addPlacement(await blobToDataUrl(blob), category)
    } else {
      setUploadNote(null)
      const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(path)
      addPlacement(publicUrl, category)
    }

    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  // ── cart & save ──────────────────────────────────────────────────
  function validate(): boolean {
    if (!size) { setNotice('Pick a size first.'); return false }
    if (placements.length === 0) { setNotice('Add at least one sticker, image or text to your tee.'); return false }
    setNotice(null)
    return true
  }

  function handleAddToCart() {
    if (!validate()) return
    addCustom({ fit: fitId, size: size || 'M', colorId, placements }, qty)
    navigate('/cart')
  }

  function handleBuyNow() {
    if (!validate()) return
    addCustom({ fit: fitId, size: size || 'M', colorId, placements }, qty)
    navigate('/checkout')
  }

  // ── save to your designs ──────────────────────────────────────────
  async function handleAddToYourDesign() {
    if (placements.length === 0) {
      setNotice('Add at least one sticker, image or text to save to your designs.')
      return
    }
    setSaving(true)
    setNotice(null)
    const activeSize = size || 'M'
    const nameToSave = designName.trim() || `Tee design · ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
    const config: CustomConfig = { fit: fitId, size: activeSize, colorId, placements }
    const { localOnly } = await saveDesign(user?.id, nameToSave, config)
    setSaving(false)
    setSaveMsg(localOnly
      ? '✓ Added to your designs (saved on this device)!'
      : '✓ Added to your designs!')
  }

  function openSaveModal() {
    if (!designName) {
      setDesignName(`Custom tee · ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`)
    }
    setSaveMsg(null)
    setSaveOpen(true)
  }

  async function handleSaveModalConfirm() {
    if (placements.length === 0) return
    setSaving(true)
    const activeSize = size || 'M'
    const config: CustomConfig = { fit: fitId, size: activeSize, colorId, placements }
    const { localOnly } = await saveDesign(user?.id, designName.trim() || 'Untitled design', config)
    setSaving(false)
    setSaveOpen(false)
    setSaveMsg(localOnly
      ? '✓ Saved to your designs (on this device)!'
      : '✓ Saved to your designs!')
  }

  // ── pricing helpers ───────────────────────────────────────────────
  const designTotal = scales.reduce((s, sc) => s + priceForScale(sc), 0)

  if (authLoading || !user) {
    return (
      <div style={{ padding: '80px 16px', textAlign: 'center' }}>
        <p style={{ color: 'var(--smoke)', fontSize: 14 }}>Taking you to sign in…</p>
        <button onClick={() => navigate('/login?next=/customize')}
          style={{ marginTop: 14, padding: '11px 22px', borderRadius: 999, background: 'var(--ink)', color: 'var(--paper)', border: 0, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          Sign in to design
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '24px 16px 60px' }}>
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

      {/* Save design modal */}
      {saveOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'grid', placeItems: 'center', background: 'rgba(23,21,18,.55)' }}
          onClick={() => setSaveOpen(false)}>
          <div style={{ width: '100%', maxWidth: 420, background: '#fffdf9', border: '1px solid var(--line)', borderRadius: 28, padding: 24 }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20 }}>Save this design</h3>
            <p style={{ color: 'var(--smoke)', fontSize: 13, marginTop: 6 }}>Keep it in Your designs and finish it whenever you like.</p>
            <input value={designName} onChange={e => setDesignName(e.target.value)} maxLength={60} placeholder="e.g. Birthday tee for amma"
              style={{ display: 'block', width: '100%', marginTop: 14, padding: '10px 13px', border: '1px solid var(--line)', borderRadius: 12, fontSize: 14, background: 'var(--shell)', color: 'var(--ink)' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <button onClick={() => setSaveOpen(false)} style={{ padding: '9px 18px', borderRadius: 999, border: '1px solid var(--line)', background: 'var(--paper)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSaveModalConfirm} disabled={saving} style={{ padding: '9px 18px', borderRadius: 999, background: 'var(--ink)', color: '#fff', border: 0, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                <Bookmark size={13} style={{ display: 'inline', marginRight: 5, verticalAlign: '-2px' }} />
                {saving ? 'Saving…' : 'Save design'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload: crop, position, then place */}
      {cropFile && (
        <CropModal
          file={cropFile}
          onCancel={() => { setCropFile(null); if (fileRef.current) fileRef.current.value = '' }}
          onConfirm={handleCropConfirm}
        />
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, letterSpacing: '-0.025em' }}>Design your tee</h1>
          <p style={{ color: 'var(--smoke)', fontSize: 13, marginTop: 4 }}>
            Fit, colour, stickers, your own photo and text — all on one page.
          </p>
        </div>
        {placements.length > 0 && (
          <button onClick={clearAll} style={{ fontSize: 12.5, color: 'var(--smoke)', background: 'none', border: 0, textDecoration: 'underline', cursor: 'pointer' }}>
            Clear all ({placements.length})
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,320px),1fr))', gap: 22, alignItems: 'start' }}>

        {/* ── Left: live tee + checkout ───────────────────────────── */}
        <div className="studio-stage">
          <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 22, padding: 12 }}>
            {/* Front / back switch — artwork sticks to the face you are viewing */}
            <div style={{ display: 'flex', gap: 4, padding: 4, background: 'var(--shell)', borderRadius: 999, marginBottom: 10 }}>
              {(['front', 'back'] as const).map(s => {
                const active = side === s
                const count = placements.filter(p => sideOf(p) === s).length
                return (
                  <button key={s} onClick={() => changeSide(s)} aria-pressed={active}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: '8px 10px', borderRadius: 999, border: 0, cursor: 'pointer', fontWeight: 600, fontSize: 12,
                      background: active ? 'var(--paper)' : 'transparent',
                      color: active ? 'var(--ink)' : 'var(--smoke)',
                      boxShadow: active ? '0 1px 4px rgba(23,21,18,.14)' : 'none',
                    }}>
                    <Shirt size={13} style={s === 'back' ? { transform: 'scaleX(-1)' } : undefined} />
                    {s === 'front' ? 'Front' : 'Back'}
                    {count > 0 && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 999,
                        background: active ? 'var(--ink)' : 'var(--line)',
                        color: active ? 'var(--paper)' : 'var(--smoke)',
                      }}>{count}</span>
                    )}
                  </button>
                )
              })}
            </div>

            <Tee3DPreview
              colorHex={color.hex}
              placements={placements}
              selectedIndex={selectedIdx}
              onSelectPlacement={setSelectedIdx}
              onMovePlacement={updateP}
              side={side}
              onSideChange={changeSide}
            />

            {/* Active sticker zoom & live price pill on the bottom of preview */}
            {sel && selectedIdx !== null && (() => {
              const info = getCategoryFromScale(sel.scale)
              const parsed = parsePlacementRef(sel.ref)
              const label = sel.text ? `"${sel.text.content.slice(0, 14)}"` : parsed?.type === 'builtin' ? (getSticker(parsed.id)?.nameEn ?? 'Sticker') : isStickerRef(sel.ref) ? 'Sticker' : 'Custom Image'
              return (
                <div style={{
                  marginTop: 10, padding: '10px 14px', borderRadius: 14,
                  background: 'var(--shell)', border: '1px solid var(--line)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{label}</span>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 999,
                      background: info.category === 'large' ? '#c8542f' : info.category === 'medium' ? '#d48b1b' : '#334155',
                      color: '#fff',
                    }}>
                      {info.labelShort} (+{formatINR(info.price)})
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: 'var(--smoke)', fontWeight: 600 }}>Zoom:</span>
                    <button
                      type="button"
                      onClick={() => updateP(selectedIdx, { scale: Math.max(8, sel.scale - 6) })}
                      title="Zoom out (decreases price when small)"
                      style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--paper)', cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'var(--ink)' }}
                    >
                      <ZoomOut size={13} />
                    </button>
                    <span style={{ fontSize: 11.5, fontWeight: 700, minWidth: 32, textAlign: 'center' }}>
                      {Math.round(sel.scale)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => updateP(selectedIdx, { scale: Math.min(72, sel.scale + 6) })}
                      title="Zoom in (increases price when large)"
                      style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--paper)', cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'var(--ink)' }}
                    >
                      <ZoomIn size={13} />
                    </button>
                  </div>
                </div>
              )
            })()}

            {/* Chips + hint (hidden on small screens so the editor stays in view) */}
            <div className="tee-extra">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 10 }}>
                {[
                  lang === 'ta' ? fit.nameTa : fit.nameEn,
                  size ? `Size ${size}` : 'Size M',
                  lang === 'ta' ? color.nameTa : color.nameEn,
                  placements.length > 0 ? `${placements.length} print${placements.length > 1 ? 's' : ''}` : null,
                ].filter(Boolean).map((chip, i) => (
                  <span key={i} style={{ border: '1px solid var(--line)', borderRadius: 999, padding: '3px 11px', fontSize: 11, fontWeight: 600, color: 'var(--smoke)', background: 'var(--paper)' }}>
                    {chip}
                  </span>
                ))}
              </div>
              <p style={{ textAlign: 'center', fontSize: 10.5, color: 'var(--smoke)', marginTop: 6 }}>
                Drag the tee to spin · Click & drag sticker to move · Zoom to resize & change price
              </p>
            </div>

            {/* Price breakdown at bottom */}
            <div style={{ borderTop: '1px solid var(--line)', marginTop: 10, paddingTop: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--smoke)', marginBottom: 4 }}>
                <span>{fit.nameEn} Tee ({size || 'M'})</span>
                <span style={{ fontWeight: 600 }}>{formatINR(fit.price)}</span>
              </div>
              {placements.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 6 }}>
                  {placements.map((p, i) => {
                    const pInfo = getCategoryFromScale(p.scale)
                    const pParsed = parsePlacementRef(p.ref)
                    const pName = p.text ? `Text "${p.text.content.slice(0, 12)}"` : pParsed?.type === 'builtin' ? (getSticker(pParsed.id)?.nameEn ?? 'Sticker') : isStickerRef(p.ref) ? 'Sticker' : 'Uploaded Photo'
                    return (
                      <div key={p.id || i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--smoke)' }}>
                        <span>• {pName} ({pInfo.labelShort})</span>
                        <span style={{ fontWeight: 600, color: 'var(--ink)' }}>+{formatINR(pInfo.price)}</span>
                      </div>
                    )
                  })}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 6, borderTop: '1px dashed var(--line)' }}>
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>Total Price</span>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, color: 'var(--ink)' }}>{formatINR(total)}</span>
              </div>
            </div>

            {/* Quantity */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--smoke)' }}>Quantity:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={() => setQty(q => Math.max(1, q - 1))} aria-label="Decrease quantity"
                  style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--line)', background: 'var(--paper)', fontWeight: 700, cursor: 'pointer' }}>−</button>
                <span style={{ minWidth: 20, textAlign: 'center', fontWeight: 700, fontSize: 13.5 }}>{qty}</span>
                <button onClick={() => setQty(q => Math.min(10, q + 1))} aria-label="Increase quantity"
                  style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--line)', background: 'var(--paper)', fontWeight: 700, cursor: 'pointer', opacity: qty >= 10 ? .4 : 1 }}>+</button>
              </div>
            </div>

            {notice && (
              <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 10, background: '#fdf0ec', border: '1px solid #f6cfc3', color: 'var(--rust)', fontSize: 12, fontWeight: 600 }}>
                {notice}
              </div>
            )}

            {/* ── Two main options requested by user: "Buy now" & "Add to your design" ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
              <button
                onClick={handleBuyNow}
                style={{
                  padding: '13px 12px', borderRadius: 999, background: 'var(--rust)', color: '#fff',
                  border: 0, fontWeight: 700, fontSize: 14, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  boxShadow: '0 2px 8px rgba(200,84,47,.25)', transition: 'transform 0.1s ease',
                }}
              >
                Buy now
              </button>
              <button
                onClick={handleAddToYourDesign}
                disabled={saving}
                style={{
                  padding: '13px 12px', borderRadius: 999, background: 'var(--ink)', color: 'var(--paper)',
                  border: 0, fontWeight: 700, fontSize: 13.5, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  boxShadow: '0 2px 6px rgba(23,21,18,.15)',
                }}
              >
                <Bookmark size={14} />
                {saving ? 'Adding…' : 'Add to your design'}
              </button>
            </div>

            {/* Secondary: Add to bag & Rename design */}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                onClick={handleAddToCart}
                style={{
                  flex: 1, padding: '9px 12px', borderRadius: 999, border: '1px solid var(--line)',
                  background: 'var(--paper)', fontWeight: 600, fontSize: 12.5, cursor: 'pointer', color: 'var(--ink)',
                }}
              >
                Add to bag
              </button>
              <button
                onClick={openSaveModal}
                title="Name this design before saving"
                style={{
                  padding: '9px 14px', borderRadius: 999, border: '1px solid var(--line)',
                  background: 'var(--paper)', fontWeight: 600, fontSize: 12, cursor: 'pointer', color: 'var(--smoke)',
                }}
              >
                Rename & Save
              </button>
            </div>

            {saveMsg && (
              <div style={{
                marginTop: 10, padding: '10px 14px', borderRadius: 14,
                background: '#e9f3e6', border: '1px solid #b9d4b0', color: '#27521c',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, fontSize: 12.5,
              }}>
                <span>{saveMsg}</span>
                <Link to="/designs" style={{ fontWeight: 700, color: '#1f4415', textDecoration: 'underline', whiteSpace: 'nowrap' }}>
                  View designs →
                </Link>
              </div>
            )}
          </div>

          {/* Selected element editor */}
          {sel && selectedIdx !== null && (
            <PlacementPanel
              placement={sel}
              index={selectedIdx}
              onChange={updateP}
              onRemove={removeP}
            />
          )}
        </div>

        {/* ── Right: every editable, always visible ────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          <Section title="Fit" hint="Included in tee price">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {FITS.map(f => (
                <button key={f.id} onClick={() => setFitId(f.id)}
                  style={{ padding: 13, borderRadius: 16, border: `1px solid ${fitId === f.id ? 'var(--ink)' : 'var(--line)'}`, background: fitId === f.id ? 'rgba(23,21,18,.03)' : 'var(--paper)', textAlign: 'left', cursor: 'pointer', outline: fitId === f.id ? '1px solid var(--ink)' : 'none', outlineOffset: -1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: 13.5 }}>{lang === 'ta' ? f.nameTa : f.nameEn}</span>
                    <span style={{ fontWeight: 700, fontSize: 12.5 }}>{formatINR(f.price)}</span>
                  </div>
                  <p style={{ color: 'var(--smoke)', fontSize: 11, marginTop: 4 }}>{lang === 'ta' ? f.descTa : f.descEn}</p>
                </button>
              ))}
            </div>
          </Section>

          <Section title="Size" hint={size ? `Selected ${size}` : 'Required'}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {SIZES.map(s => (
                <button key={s} onClick={() => { setSize(s); setNotice(null) }}
                  style={{ minWidth: 48, padding: '10px 14px', borderRadius: 12, border: `1px solid ${size === s ? 'var(--ink)' : 'var(--line)'}`, background: size === s ? 'var(--ink)' : 'var(--paper)', color: size === s ? 'var(--paper)' : 'var(--ink)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                  {s}
                </button>
              ))}
            </div>
          </Section>

          <Section title="Tee colour" hint={lang === 'ta' ? color.nameTa : color.nameEn}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(64px,1fr))', gap: 8 }}>
              {TEE_COLORS.map(c => (
                <button key={c.id} onClick={() => setColorId(c.id)}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: 8, borderRadius: 14, border: `1px solid ${colorId === c.id ? 'var(--ink)' : 'var(--line)'}`, background: colorId === c.id ? 'rgba(23,21,18,.03)' : 'var(--paper)', cursor: 'pointer', outline: colorId === c.id ? '1px solid var(--ink)' : 'none', outlineOffset: -1 }}>
                  <span style={{ width: 34, height: 34, borderRadius: '50%', background: c.hex, border: '1px solid var(--line)', display: 'grid', placeItems: 'center' }}>
                    {colorId === c.id && <Check size={15} color={c.tone === 'dark' ? '#fff' : '#171512'} />}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 500 }}>{lang === 'ta' ? c.nameTa : c.nameEn}</span>
                </button>
              ))}
            </div>
          </Section>

          <Section title="Stickers & artwork" hint={`${placements.length} placed · max 10`}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {STICKER_GROUPS.map(g => (
                <button key={g.id} onClick={() => setStickerCat(g.id)}
                  style={{
                    padding: '7px 12px', borderRadius: 999, fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                    border: `1px solid ${stickerCat === g.id ? 'var(--ink)' : 'var(--line)'}`,
                    background: stickerCat === g.id ? 'var(--ink)' : 'var(--paper)',
                    color: stickerCat === g.id ? 'var(--paper)' : 'var(--smoke)',
                  }}>
                  {g.label}
                </button>
              ))}
            </div>
            <p style={{ color: 'var(--smoke)', fontSize: 10.5, marginTop: 8 }}>
              {STICKER_GROUPS.find(g => g.id === stickerCat)?.hint} · click a sticker to stick it on the <strong style={{ color: 'var(--ink)' }}>{side}</strong> of the tee, then drag it across the fabric — size and rotation are in the panel under the preview
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(84px,1fr))', gap: 8, marginTop: 8 }}>
              {libraryStickers.filter(s => s.category === stickerCat).map(s => {
                const placed = placements.some(p => p.ref === s.src && sideOf(p) === side)
                return (
                  <button key={s.id} onClick={() => toggleSticker(s.src, s.category)} title={s.name}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: 7, borderRadius: 14, border: `1px solid ${placed ? 'var(--ink)' : 'var(--line)'}`, background: placed ? 'rgba(23,21,18,.03)' : 'var(--paper)', cursor: 'pointer', position: 'relative', outline: placed ? '1px solid var(--ink)' : 'none', outlineOffset: -1 }}>
                    <span style={{
                      width: '100%', aspectRatio: '1', borderRadius: 10, overflow: 'hidden',
                      display: 'grid', placeItems: 'center', padding: 5,
                      background: 'repeating-conic-gradient(#f1eadf 0% 25%, #fffdf9 0% 50%) 50% / 12px 12px',
                    }}>
                      <img src={s.src} alt={s.name} loading="lazy"
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </span>
                    <span style={{ fontSize: 9.5, fontWeight: 600, textAlign: 'center', lineHeight: 1.2 }}>{s.name}</span>
                    {placed && <span style={{ position: 'absolute', top: 4, right: 4, width: 16, height: 16, background: 'var(--ink)', borderRadius: '50%', display: 'grid', placeItems: 'center' }}><Check size={10} color="#fff" /></span>}
                  </button>
                )
              })}
            </div>

            {libraryStickers.filter(s => s.category === stickerCat).length === 0 && (
              <p style={{ color: 'var(--smoke)', fontSize: 11, marginTop: 10, lineHeight: 1.5 }}>
                No stickers in this category yet. Add artwork from Admin → Stickers and it shows up here.
              </p>
            )}
          </Section>

          <Section title="Your own photo" hint="Crop, zoom, place">
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) setCropFile(f) }} />
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 999, border: '1px solid var(--ink)', background: 'var(--paper)', fontWeight: 600, fontSize: 12.5, cursor: 'pointer' }}>
              {uploading
                ? <><span style={{ width: 14, height: 14, border: '2px solid var(--ink)', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.6s linear infinite' }} />Uploading…</>
                : <><Upload size={14} />Upload an image</>}
            </button>
            <p style={{ color: 'var(--smoke)', fontSize: 11, marginTop: 8 }}>
              PNG, JPG or WebP · drag to position, zoom to crop, then pick the print size
            </p>
            {uploadNote && <p style={{ color: 'var(--smoke)', fontSize: 10.5, marginTop: 4 }}>{uploadNote}</p>}
          </Section>

          <Section title="Text" hint="Up to 120 characters">
            <button onClick={() => setShowTextModal(true)} disabled={placements.length >= 10}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 999, border: '1px solid var(--ink)', background: 'var(--paper)', fontWeight: 600, fontSize: 12.5, cursor: 'pointer', opacity: placements.length >= 10 ? .5 : 1 }}>
              <Type size={14} />Add text
            </button>
            <p style={{ color: 'var(--smoke)', fontSize: 11, marginTop: 8 }}>
              Names, numbers, slogans — fonts and colours in the editor panel
            </p>
          </Section>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        /* Desktop keeps the tee pinned beside the options. Once the page is a
           single column the card must scroll with the page — a sticky card
           taller than the viewport would cover the Fit/Size/Colour sections. */
        .studio-stage { position: sticky; top: 20px; max-height: calc(100vh - 40px); overflow-y: auto; }
        @media (max-width: 760px) {
          .studio-stage { position: static; top: auto; max-height: none; overflow: visible; }
        }
        @media (max-width: 780px) {
          .tee-extra { display: none !important; }
        }
      `}</style>
    </div>
  )
}

// ── Section wrapper ───────────────────────────────────────────────────
function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 22, padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16 }}>{title}</h2>
        {hint && <span style={{ fontSize: 11, color: 'var(--smoke)', textAlign: 'right' }}>{hint}</span>}
      </div>
      <div style={{ marginTop: 12 }}>{children}</div>
    </section>
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

        {/* Size + rotation with live price */}
        {(() => {
          const info = getCategoryFromScale(placement.scale)
          return (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--smoke)' }}>
                  Print Size & Price
                </span>
                <span style={{
                  fontSize: 11.5, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                  background: info.category === 'large' ? '#c8542f' : info.category === 'medium' ? '#d48b1b' : '#334155',
                  color: '#fff',
                }}>
                  {info.labelShort} · +{formatINR(info.price)}
                </span>
              </div>

              {/* 3 Size buttons: Small, Medium, Large */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 10 }}>
                <button
                  type="button"
                  onClick={() => onChange(index, { scale: 18 })}
                  style={{
                    padding: '8px 4px', borderRadius: 10,
                    border: `1.5px solid ${info.category === 'small' ? 'var(--ink)' : 'var(--line)'}`,
                    background: info.category === 'small' ? 'var(--ink)' : 'var(--paper)',
                    color: info.category === 'small' ? '#fff' : 'var(--ink)',
                    cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700 }}>Small</div>
                  <div style={{ fontSize: 10, opacity: 0.85 }}>+{formatINR(CUSTOM_PRICE_SMALL)}</div>
                </button>
                <button
                  type="button"
                  onClick={() => onChange(index, { scale: 36 })}
                  style={{
                    padding: '8px 4px', borderRadius: 10,
                    border: `1.5px solid ${info.category === 'medium' ? 'var(--ink)' : 'var(--line)'}`,
                    background: info.category === 'medium' ? 'var(--ink)' : 'var(--paper)',
                    color: info.category === 'medium' ? '#fff' : 'var(--ink)',
                    cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700 }}>Medium</div>
                  <div style={{ fontSize: 10, opacity: 0.85 }}>+{formatINR(CUSTOM_PRICE_MEDIUM)}</div>
                </button>
                <button
                  type="button"
                  onClick={() => onChange(index, { scale: 58 })}
                  style={{
                    padding: '8px 4px', borderRadius: 10,
                    border: `1.5px solid ${info.category === 'large' ? 'var(--ink)' : 'var(--line)'}`,
                    background: info.category === 'large' ? 'var(--ink)' : 'var(--paper)',
                    color: info.category === 'large' ? '#fff' : 'var(--ink)',
                    cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700 }}>Large</div>
                  <div style={{ fontSize: 10, opacity: 0.85 }}>+{formatINR(CUSTOM_PRICE_LARGE)}</div>
                </button>
              </div>

              <Slider label="Zoom / Size on tee" value={placement.scale} min={8} max={72} unit="%" onChange={v => onChange(index, { scale: v })} />
              <p style={{ fontSize: 10.5, color: 'var(--smoke)', marginTop: 4 }}>
                Zoom in or out to resize · Price automatically increases or decreases with size
              </p>
            </div>
          )
        })()}

        <Slider label="Rotate" value={placement.rotation} min={-180} max={180} unit="°" onChange={v => onChange(index, { rotation: v })} />

        {/* Image crop & zoom — like Word / PowerPoint */}
        {parsed?.type === 'image' && (
          <ImageCropEditor
            src={placement.ref}
            crop={placement.crop}
            onChange={patch => onChange(index, patch)}
          />
        )}
      </div>
    </div>
  )
}

function ImageCropEditor({
  src,
  crop,
  onChange,
}: {
  src: string
  crop?: { offsetX: number; offsetY: number; zoom: number }
  onChange: (patch: { crop: { offsetX: number; offsetY: number; zoom: number } }) => void
}) {
  const currentCrop = crop ?? { offsetX: 0, offsetY: 0, zoom: 1 }
  const zoom = currentCrop.zoom ?? 1
  const ox = currentCrop.offsetX ?? 0
  const oy = currentCrop.offsetY ?? 0

  const [dragging, setDragging] = useState(false)
  const dragRef = useRef<{ sx: number; sy: number; startOx: number; startOy: number } | null>(null)

  function updateZoom(z: number) {
    const clampedZ = Math.max(1, Math.min(3.5, Math.round(z * 100) / 100))
    const maxOff = Math.max(0, 1 - 1 / clampedZ)
    onChange({
      crop: {
        zoom: clampedZ,
        offsetX: Math.max(-maxOff, Math.min(maxOff, ox)),
        offsetY: Math.max(-maxOff, Math.min(maxOff, oy)),
      },
    })
  }

  function updateOffset(nox: number, noy: number) {
    const maxOff = Math.max(0.01, 1 - 1 / zoom)
    onChange({
      crop: {
        zoom,
        offsetX: Math.max(-maxOff, Math.min(maxOff, Math.round(nox * 100) / 100)),
        offsetY: Math.max(-maxOff, Math.min(maxOff, Math.round(noy * 100) / 100)),
      },
    })
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    setDragging(true)
    dragRef.current = { sx: e.clientX, sy: e.clientY, startOx: ox, startOy: oy }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.sx
    const dy = e.clientY - dragRef.current.sy
    const sens = 0.01 / (zoom > 1 ? zoom : 1)
    updateOffset(dragRef.current.startOx + dx * sens, dragRef.current.startOy + dy * sens)
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    setDragging(false)
    dragRef.current = null
    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch {}
  }

  function handleWheel(e: React.WheelEvent<HTMLDivElement>) {
    e.preventDefault()
    const delta = e.deltaY < 0 ? 0.1 : -0.1
    updateZoom(zoom + delta)
  }

  const isCropped = zoom > 1 || ox !== 0 || oy !== 0

  return (
    <div style={{ borderTop: '1px solid var(--line)', paddingTop: 14, marginTop: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Crop size={14} style={{ color: 'var(--ink)' }} />
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink)' }}>
            Crop &amp; Zoom Picture
          </p>
        </div>
        {isCropped && (
          <button
            type="button"
            onClick={() => onChange({ crop: { offsetX: 0, offsetY: 0, zoom: 1 } })}
            style={{ fontSize: 11, color: 'var(--rust)', background: 'none', border: 0, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
          >
            <RotateCcw size={11} /> Reset
          </button>
        )}
      </div>

      {/* Interactive Crop Frame like PowerPoint / Word */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        title="Drag picture to pan · Scroll wheel to zoom"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 240,
          aspectRatio: '1',
          margin: '0 auto 12px',
          borderRadius: 12,
          overflow: 'hidden',
          background: 'repeating-conic-gradient(#f1eadf 0% 25%, #fffdf9 0% 50%) 50% / 12px 12px',
          border: '2px solid rgba(23,21,18,0.7)',
          cursor: zoom > 1 ? (dragging ? 'grabbing' : 'grab') : 'crosshair',
          touchAction: 'none',
          userSelect: 'none',
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.4), 0 3px 10px rgba(0,0,0,0.06)',
        }}
      >
        {/* Word/PPT Crop Corner Marks */}
        <span style={{ position: 'absolute', top: 0, left: 0, width: 14, height: 14, borderTop: '3px solid #171512', borderLeft: '3px solid #171512', zIndex: 10, pointerEvents: 'none' }} />
        <span style={{ position: 'absolute', top: 0, right: 0, width: 14, height: 14, borderTop: '3px solid #171512', borderRight: '3px solid #171512', zIndex: 10, pointerEvents: 'none' }} />
        <span style={{ position: 'absolute', bottom: 0, left: 0, width: 14, height: 14, borderBottom: '3px solid #171512', borderLeft: '3px solid #171512', zIndex: 10, pointerEvents: 'none' }} />
        <span style={{ position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderBottom: '3px solid #171512', borderRight: '3px solid #171512', zIndex: 10, pointerEvents: 'none' }} />

        {/* Rule of thirds grid lines */}
        <span style={{ position: 'absolute', left: '33.33%', top: 0, bottom: 0, width: 1, background: 'rgba(23,21,18,0.15)', pointerEvents: 'none', zIndex: 5 }} />
        <span style={{ position: 'absolute', left: '66.66%', top: 0, bottom: 0, width: 1, background: 'rgba(23,21,18,0.15)', pointerEvents: 'none', zIndex: 5 }} />
        <span style={{ position: 'absolute', top: '33.33%', left: 0, right: 0, height: 1, background: 'rgba(23,21,18,0.15)', pointerEvents: 'none', zIndex: 5 }} />
        <span style={{ position: 'absolute', top: '66.66%', left: 0, right: 0, height: 1, background: 'rgba(23,21,18,0.15)', pointerEvents: 'none', zIndex: 5 }} />

        {/* Live Pan & Zoomed Image */}
        <img
          src={src}
          alt=""
          draggable={false}
          style={{
            position: 'absolute',
            width: `${zoom * 100}%`,
            height: `${zoom * 100}%`,
            left: `${50 - (zoom * 50) + ox * ((zoom - 1) * 50)}%`,
            top: `${50 - (zoom * 50) + oy * ((zoom - 1) * 50)}%`,
            objectFit: 'contain',
            pointerEvents: 'none',
            display: 'block',
            transition: dragging ? 'none' : 'transform 0.05s ease-out',
          }}
        />

        {/* Drag Hint overlay */}
        <span style={{
          position: 'absolute',
          bottom: 6,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 8px',
          borderRadius: 999,
          background: 'rgba(23,21,18,0.7)',
          color: '#fff',
          fontSize: 9.5,
          fontWeight: 600,
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          zIndex: 10,
        }}>
          <Move size={10} /> Drag picture to pan
        </span>
      </div>

      {/* Zoom Quick Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <button
          type="button"
          onClick={() => updateZoom(zoom - 0.2)}
          disabled={zoom <= 1}
          title="Zoom out"
          style={{
            width: 28, height: 28, borderRadius: 8, border: '1px solid var(--line)',
            background: 'var(--paper)', display: 'grid', placeItems: 'center',
            cursor: zoom <= 1 ? 'default' : 'pointer', opacity: zoom <= 1 ? 0.4 : 1,
          }}
        >
          <ZoomOut size={13} />
        </button>
        <div style={{ flex: 1 }}>
          <Slider
            label="Picture Zoom"
            value={zoom}
            min={1}
            max={3.5}
            step={0.05}
            unit="×"
            onChange={updateZoom}
          />
        </div>
        <button
          type="button"
          onClick={() => updateZoom(zoom + 0.2)}
          disabled={zoom >= 3.5}
          title="Zoom in"
          style={{
            width: 28, height: 28, borderRadius: 8, border: '1px solid var(--line)',
            background: 'var(--paper)', display: 'grid', placeItems: 'center',
            cursor: zoom >= 3.5 ? 'default' : 'pointer', opacity: zoom >= 3.5 ? 0.4 : 1,
          }}
        >
          <ZoomIn size={13} />
        </button>
      </div>

      {/* Fine-tuning Pan Sliders (revealed when zoomed) */}
      {zoom > 1 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 6 }}>
          <Slider
            label="Pan X"
            value={Math.round(ox * 100)}
            min={-100}
            max={100}
            step={2}
            unit="%"
            onChange={v => updateOffset(v / 100, oy)}
          />
          <Slider
            label="Pan Y"
            value={Math.round(oy * 100)}
            min={-100}
            max={100}
            step={2}
            unit="%"
            onChange={v => updateOffset(ox, v / 100)}
          />
        </div>
      )}

      {/* Quick Presets */}
      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
        <button
          type="button"
          onClick={() => onChange({ crop: { offsetX: 0, offsetY: 0, zoom: 1 } })}
          style={{
            flex: 1, padding: '5px 8px', borderRadius: 8, border: '1px solid var(--line)',
            background: zoom === 1 ? 'rgba(23,21,18,0.06)' : 'var(--paper)',
            fontSize: 10.5, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Fit (100%)
        </button>
        <button
          type="button"
          onClick={() => updateZoom(1.35)}
          style={{
            flex: 1, padding: '5px 8px', borderRadius: 8, border: '1px solid var(--line)',
            background: zoom === 1.35 ? 'rgba(23,21,18,0.06)' : 'var(--paper)',
            fontSize: 10.5, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Fill (135%)
        </button>
        <button
          type="button"
          onClick={() => updateZoom(2.0)}
          style={{
            flex: 1, padding: '5px 8px', borderRadius: 8, border: '1px solid var(--line)',
            background: zoom === 2 ? 'rgba(23,21,18,0.06)' : 'var(--paper)',
            fontSize: 10.5, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Close-Up (2×)
        </button>
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

function Slider({
  label,
  value,
  min,
  max,
  unit,
  step = 1,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  unit: string
  step?: number
  onChange: (v: number) => void
}) {
  const displayVal = unit === '×' ? value.toFixed(1) : Math.round(value)
  return (
    <label style={{ display: 'block' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, fontWeight: 600, color: 'var(--smoke)', marginBottom: 4 }}>
        <span style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
        <span style={{ color: 'var(--ink)' }}>{displayVal}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--ink)' }} />
    </label>
  )
}
