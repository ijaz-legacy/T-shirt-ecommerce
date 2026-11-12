import { useEffect, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { makeSlug, resizeToWebP, saveProduct } from '../lib/admin'
import { useStaffAccess } from '../lib/useStaffAccess'
import { useLang } from '../context/LangContext'
import { transliterateText } from '../lib/transliterate'

export default function Upload() {
  const { user, loading: authLoading } = useAuth()
  const { lang } = useLang()
  const navigate = useNavigate()
  // Staff status comes from the `staff` table via RLS. It is not derived from
  // user_metadata, which the signed-in user can edit themselves.
  const { ready: staffReady, isStaff } = useStaffAccess()

  if (authLoading || !staffReady) return <p style={{ padding: 40, color: 'var(--smoke)' }}>Loading…</p>

  if (!user || !isStaff) return (
    <div style={{ maxWidth: 480, margin: '60px auto', padding: '0 16px', textAlign: 'center' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28 }}>Sign in to upload</h1>
      <p style={{ color: 'var(--smoke)', marginTop: 16 }}>Only the owner and staff can create products here.</p>
      <Link to="/login?next=/admin" style={{ display: 'inline-block', marginTop: 16, padding: '11px 22px', background: 'var(--ink)', color: 'var(--paper)', borderRadius: 999, fontWeight: 600 }}>Sign in</Link>
    </div>
  )

  // ── form state ──────────────────────────────────────────────────────────
  const [nameEn, setNameEn] = useState('')
  const [nameTa, setNameTa] = useState('')
  const [descEn, setDescEn] = useState('')
  const [descTa, setDescTa] = useState('')
  const [nameEnPending, setNameEnPending] = useState('')
  const [descEnPending, setDescEnPending] = useState('')
  const [price, setPrice] = useState(699)
  const [colorEn, setColorEn] = useState('Sand')
  const [colorTa, setColorTa] = useState('சாண்ட்')
  const [colorHex, setColorHex] = useState('#D8C2A4')
  const [category, setCategory] = useState('nature')
  const [badge, setBadge] = useState<'bestseller' | 'new' | 'limited' | null>(null)
  const [featured, setFeatured] = useState(true)
  const [stock, setStock] = useState(25)
  const [slug, setSlug] = useState('')

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageInfo, setImageInfo] = useState<{ w: number; h: number } | null>(null)
  const [imageUploading, setImageUploading] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const [saving, setSaving] = useState(false)
  const [flash, setFlash] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  function lightOrDark(hex: string): string {
    const c = hex.replace('#', '')
    const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16)
    return r * 0.299 + g * 0.587 + b * 0.114 > 150 ? '#1c1b19' : '#fff'
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setImageFile(f)
    const url = URL.createObjectURL(f)
    const img = new Image()
    await new Promise<void>(res => { img.onload = () => { setImageInfo({ w: img.naturalWidth, h: img.naturalHeight }); setImagePreview(url); res() } })
    URL.revokeObjectURL(img.src)
    setSaving(false)
  }

  function clearImage() {
    setImageFile(null)
    setImagePreview(null)
    setImageInfo(null)
    if (imageInputRef.current) imageInputRef.current.value = ''
  }

  async function handleSave() {
    if (!nameEn.trim()) { setFlash({ kind: 'err', text: 'English name is required.' }); return }
    if (price < 0) { setFlash({ kind: 'err', text: 'Price must be 0 or more.' }); return }
    setSaving(true)
    setFlash(null)
    try {
      const { product } = await saveProduct({
        nameEn: nameEn.trim(),
        nameTa: nameTa.trim(),
        descEn: descEn.trim(),
        descTa: descTa.trim(),
        price,
        colorEn,
        colorTa,
        colorHex,
        category,
        badge: badge ?? null,
        featured,
        stock,
        slug: slug.trim() || undefined,
        imageFile: imageFile ?? undefined,
      })
      setFlash({ kind: 'ok', text: `Saved ${product.slug} — ${product.name_en} · ₹${product.price}` })
      clearImage()
      setNameEn(''); setNameTa(''); setDescEn(''); setDescTa('')
      setPrice(699); setColorEn('Sand'); setColorTa('சாண்ட்'); setColorHex('#D8C2A4')
      setCategory('nature'); setBadge(null); setFeatured(true); setStock(25); setSlug('')
    } catch (e: any) {
      setFlash({ kind: 'err', text: e?.message || 'Save failed.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 16px 60px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 22 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, letterSpacing: '-0.025em' }}>Create product</h1>
          <p style={{ color: 'var(--smoke)', fontSize: 13, marginTop: 4 }}>Everything you fill in here goes live on the shop immediately — no rebuild.</p>
        </div>
        <Link to="/admin" style={{ padding: '8px 16px', borderRadius: 999, border: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--smoke)', fontWeight: 600, fontSize: 13 }}>Admin →</Link>
      </div>

      {flash && (
        <div style={{ padding: 12, borderRadius: 12, background: flash.kind === 'ok' ? '#eaf7ee' : '#fbeae6', color: flash.kind === 'ok' ? '#1e6b3a' : 'var(--rust)', fontSize: 13, marginBottom: 16 }}>
          {flash.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--smoke)', display: 'block', marginBottom: 4 }}>Name (English)</label>
          <input value={nameEn} onChange={e => {
            setNameEn(e.target.value)
            setNameTa(transliterateText(e.target.value))
          }} placeholder="e.g. Kadal Dawn" style={{ width: '100%', padding: '10px 13px', border: '1px solid var(--line)', borderRadius: 12, fontSize: 14, background: 'var(--shell)', color: 'var(--ink)' }} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--smoke)', display: 'block', marginBottom: 4 }}>Name (Tamil)</label>
          <input value={nameTa} readOnly placeholder="அ invol" style={{ width: '100%', padding: '10px 13px', border: '1px solid var(--line)', borderRadius: 12, fontSize: 14, background: 'var(--shell)', color: 'var(--ink)' }} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--smoke)', display: 'block', marginBottom: 4 }}>Price (₹)</label>
          <input type="number" min="0" step="1" value={price} onChange={e => setPrice(Number(e.target.value))} style={{ width: '100%', padding: '10px 13px', border: '1px solid var(--line)', borderRadius: 12, fontSize: 14, background: 'var(--shell)', color: 'var(--ink)' }} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--smoke)', display: 'block', marginBottom: 4 }}>Stock</label>
          <input type="number" min="0" step="1" value={stock} onChange={e => setStock(Math.max(0, Number(e.target.value)))} style={{ width: '100%', padding: '10px 13px', border: '1px solid var(--line)', borderRadius: 12, fontSize: 14, background: 'var(--shell)', color: 'var(--ink)' }} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--smoke)', display: 'block', marginBottom: 4 }}>Colour name (EN)</label>
          <input value={colorEn} onChange={e => {
            setColorEn(e.target.value)
            setColorTa(transliterateText(e.target.value))
          }} placeholder="e.g. Sand" style={{ width: '100%', padding: '10px 13px', border: '1px solid var(--line)', borderRadius: 12, fontSize: 14, background: 'var(--shell)', color: 'var(--ink)' }} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--smoke)', display: 'block', marginBottom: 4 }}>Colour name (TA)</label>
          <input value={colorTa} readOnly placeholder="அ invol" style={{ width: '100%', padding: '10px 13px', border: '1px solid var(--line)', borderRadius: 12, fontSize: 14, background: 'var(--shell)', color: 'var(--ink)' }} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--smoke)', display: 'block', marginBottom: 4 }}>Colour hex</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={colorHex} onChange={e => setColorHex(e.target.value)} placeholder="#D8C2A4" style={{ width: '100%', padding: '10px 13px', border: '1px solid var(--line)', borderRadius: 12, fontSize: 14, background: 'var(--shell)', color: 'var(--ink)' }} />
            <span style={{ width: 40, height: 40, borderRadius: 8, background: colorHex, border: '1px solid var(--line)', display: 'grid', placeItems: 'center', fontSize: 10, color: lightOrDark(colorHex), fontWeight: 700 }}>{colorHex || '#000'}</span>
          </div>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--smoke)', display: 'block', marginBottom: 4 }}>Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)} style={{ width: '100%', padding: '10px 13px', border: '1px solid var(--line)', borderRadius: 12, fontSize: 14, background: 'var(--shell)', color: 'var(--ink)' }}>
            <option value="nature">Nature</option>
            <option value="retro">Retro</option>
            <option value="abstract">Abstract</option>
            <option value="street">Street</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--smoke)', display: 'block', marginBottom: 4 }}>Badge</label>
          <select value={badge ?? ''} onChange={e => setBadge((e.target.value || null) as 'bestseller' | 'new' | 'limited' | null)} style={{ width: '100%', padding: '10px 13px', border: '1px solid var(--line)', borderRadius: 12, fontSize: 14, background: 'var(--shell)', color: 'var(--ink)' }}>
            <option value="">None</option>
            <option value="bestseller">Bestseller</option>
            <option value="new">New</option>
            <option value="limited">Limited</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--smoke)', display: 'block', marginBottom: 4 }}>Slug (optional)</label>
          <input value={slug} onChange={e => setSlug(e.target.value)} placeholder="auto-generated if empty" style={{ width: '100%', padding: '10px 13px', border: '1px solid var(--line)', borderRadius: 12, fontSize: 14, background: 'var(--shell)', color: 'var(--ink)' }} />
          <p style={{ fontSize: 11, color: 'var(--smoke)', marginTop: 4 }}>Leave empty for an automatic slug from the English name.</p>
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--smoke)', display: 'block', marginBottom: 4 }}>Image</label>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ padding: '10px 14px', border: '1px solid var(--ink)', borderRadius: 999, background: 'var(--paper)', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, flex: '1 1 auto' }}>
              Browse
              <input ref={imageInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageChange} style={{ display: 'none' }} />
            </label>
            {imageFile && (
              <button type="button" onClick={clearImage} style={{ padding: '10px 14px', borderRadius: 999, border: '1px solid var(--line)', background: 'var(--paper)', fontWeight: 600, fontSize: 13, cursor: 'pointer', color: 'var(--smoke)' }}>Clear</button>
            )}
            {imageInfo && (
              <span style={{ fontSize: 12, color: 'var(--smoke)' }}>{imageInfo.w}×{imageInfo.h} · will be resized to ≤1200px</span>
            )}
          </div>
          {imagePreview && (
            <div style={{ marginTop: 10, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--line)', maxWidth: 220, background: '#efe6d6' }}>
              <img src={imagePreview} alt="preview" style={{ width: '100%', display: 'block' }} />
            </div>
          )}
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--smoke)', display: 'block', marginBottom: 4 }}>Description (English)</label>
          <textarea rows={2} value={descEn} onChange={e => {
            setDescEn(e.target.value)
            setDescTa(transliterateText(e.target.value))
          }} style={{ width: '100%', padding: '10px 13px', border: '1px solid var(--line)', borderRadius: 12, fontSize: 14, resize: 'none', background: 'var(--shell)', color: 'var(--ink)' }} />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--smoke)', display: 'block', marginBottom: 4 }}>Description (Tamil)</label>
          <textarea rows={2} value={descTa} readOnly style={{ width: '100%', padding: '10px 13px', border: '1px solid var(--line)', borderRadius: 12, fontSize: 14, resize: 'none', background: 'var(--shell)', color: 'var(--ink)' }} />
        </div>
        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={featured} onChange={e => setFeatured(e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--ink)' }} />
            Featured
          </label>
          <button onClick={handleSave} disabled={saving || imageUploading} style={{ marginLeft: 'auto', padding: '11px 22px', borderRadius: 999, background: 'var(--ink)', color: 'var(--paper)', border: 0, fontWeight: 700, fontSize: 13.5, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Saving…' : 'Save product'}
          </button>
        </div>
      </div>
    </div>
  )
}