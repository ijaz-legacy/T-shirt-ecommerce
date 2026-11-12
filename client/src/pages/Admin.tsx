import { useEffect, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Upload, Trash2, Plus, Pencil, X, Package, MessageSquare, Phone, MapPin, CheckCircle2, Clock, Truck, ExternalLink, RefreshCw } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  saveProduct, updateProduct, deleteProduct, saveSticker, deleteSticker,
  fetchStaff, addStaff, removeStaff, updateStaff, uploadProductImage,
  fetchAdminOrders, updateAdminOrderStatus,
  type StaffMember, type AdminOrder,
} from '../lib/admin'
import { useStaffAccess } from '../lib/useStaffAccess'
import type { Product, Sticker } from '../lib/types'
import { supabase } from '../lib/supabase'
import { formatINR } from '../lib/currency'
import { transliterateText } from '../lib/transliterate'

export {};

const CATEGORIES = ['nature', 'retro', 'abstract', 'street']
const BADGES: Array<'bestseller' | 'new' | 'limited' | null> = ['bestseller', 'new', 'limited', null]

function StickerTile({ sticker, onRemove, loading }: { sticker: Sticker; onRemove: () => void; loading: boolean }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 14, padding: '10px 0', borderTop: '1px solid var(--line)', alignItems: 'center' }}>
      <div style={{ width: 56, height: 56, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--line)', background: '#efe6d6', flexShrink: 0 }}>
        {sticker.image_url ? (
          <img src={sticker.image_url} alt={sticker.name_en} style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={e => { const t = e.currentTarget as HTMLImageElement; t.src = 'data:image/svg+xml,%3Csvg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"%3E%3Crect width=\"100\" height=\"100\" fill=\"#efe6d6\"/%3E%3C/svg%3E' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: 'var(--smoke)', fontSize: 9 }}>no img</div>
        )}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>{sticker.name_en}</span>
          <span style={{ fontSize: 12, color: 'var(--smoke)' }}>{sticker.name_ta}</span>
        </div>
        <div style={{ marginTop: 2, fontSize: 12, color: 'var(--smoke)' }}>
          {sticker.category} · {sticker.active ? 'active' : 'hidden'}
        </div>
      </div>
      <button onClick={onRemove} disabled={loading} style={{ padding: '7px 12px', borderRadius: 999, border: 0, background: 'var(--rust)', color: '#fff', fontWeight: 600, fontSize: 12, cursor: loading ? 'not-allowed' : 'pointer', flexShrink: 0 }}>
        <Trash2 size={12} style={{ display: 'inline', marginRight: 3 }} />Remove
      </button>
    </div>
  )}

const fieldStyle: React.CSSProperties = {
  width: '100%', padding: '10px 13px', border: '1px solid var(--line)',
  borderRadius: 12, fontSize: 14, background: 'var(--shell)', color: 'var(--ink)',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.1em', color: 'var(--smoke)', display: 'block', marginBottom: 4,
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={labelStyle}>{label}</span>
      {children}
    </label>
  )
}

/** Full edit panel for one product — everything the shop reads, in one place. */
function ProductEditor({ product, onClose, onSaved }: { product: Product; onClose: () => void; onSaved: (message: string) => void }) {
  const [form, setForm] = useState({
    name_en: product.name_en,
    name_ta: product.name_ta,
    desc_en: product.desc_en,
    desc_ta: product.desc_ta,
    price: String(product.price),
    stock: String(product.stock),
    color_en: product.color_en,
    color_ta: product.color_ta,
    color_hex: product.color_hex || '#171512',
    category: product.category,
    badge: product.badge ?? '',
    sort_order: String(product.sort_order),
    featured: product.featured,
    active: product.active,
  })
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setRemoveImage(false)
    setPreview(URL.createObjectURL(f))
  }

  async function handleSave() {
    setBusy(true)
    setError(null)
    try {
      const patch: Partial<Product> = {
        name_en: form.name_en.trim(),
        name_ta: form.name_ta.trim(),
        desc_en: form.desc_en.trim(),
        desc_ta: form.desc_ta.trim(),
        price: Math.max(0, Math.round(Number(form.price) || 0)),
        stock: Math.max(0, Math.round(Number(form.stock) || 0)),
        color_en: form.color_en.trim(),
        color_ta: form.color_ta.trim(),
        color_hex: form.color_hex,
        category: form.category,
        badge: form.badge.trim() || null,
        sort_order: Math.round(Number(form.sort_order) || 999),
        featured: form.featured,
        active: form.active,
      }
      if (file) patch.image = await uploadProductImage(product.slug, file)
      else if (removeImage) patch.image = ''
      await updateProduct(product.slug, patch)
      onSaved(`${patch.name_en ?? product.slug} updated.`)
      onClose()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const shownImage = preview ?? (removeImage ? null : product.image)

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(23,21,18,0.45)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '24px 16px', overflowY: 'auto' }}
      onClick={e => { if (e.target === e.currentTarget && !busy) onClose() }}
    >
      <div style={{ width: '100%', maxWidth: 760, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 24, padding: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20 }}>Edit product</h2>
            <p style={{ fontSize: 12, color: 'var(--smoke)', marginTop: 2 }}>/product/{product.slug}</p>
          </div>
          <button onClick={onClose} disabled={busy} aria-label="Close" style={{ border: '1px solid var(--line)', background: 'var(--paper)', borderRadius: 999, padding: 8, cursor: busy ? 'not-allowed' : 'pointer', color: 'var(--smoke)' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14, marginTop: 18 }}>
          <Field label="Name (English)"><input value={form.name_en} onChange={e => {
 set('name_en', e.target.value)
 set('name_ta', transliterateText(e.target.value))
}} placeholder="e.g. Kadal Dawn" style={fieldStyle} /></Field>
          <Field label="Name (Tamil)"><input value={form.name_ta} onChange={e => set('name_ta', e.target.value)} style={fieldStyle} /></Field>
          <Field label="Price (₹)"><input type="number" min={0} value={form.price} onChange={e => set('price', e.target.value)} style={fieldStyle} /></Field>
          <Field label="Stock"><input type="number" min={0} value={form.stock} onChange={e => set('stock', e.target.value)} style={fieldStyle} /></Field>
          <Field label="Colour name (English)"><input value={form.color_en} onChange={e => {
 set('color_en', e.target.value)
 set('color_ta', transliterateText(e.target.value))
}} placeholder="e.g. Sand" style={fieldStyle} /></Field>
          <Field label="Colour name (Tamil)"><input value={form.color_ta} onChange={e => set('color_ta', e.target.value)} style={fieldStyle} /></Field>
          <Field label="Colour swatch">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="color" value={form.color_hex} onChange={e => set('color_hex', e.target.value)} style={{ width: 44, height: 42, border: '1px solid var(--line)', borderRadius: 10, background: 'var(--shell)', padding: 3 }} />
              <input value={form.color_hex} onChange={e => set('color_hex', e.target.value)} style={fieldStyle} />
            </div>
          </Field>
          <Field label="Category">
            <select value={form.category} onChange={e => set('category', e.target.value)} style={fieldStyle}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Badge">
            <select value={form.badge} onChange={e => set('badge', e.target.value)} style={fieldStyle}>
              {BADGES.map(b => <option key={b ?? 'none'} value={b ?? ''}>{b ?? 'none'}</option>)}
            </select>
          </Field>
          <Field label="Sort order"><input type="number" value={form.sort_order} onChange={e => set('sort_order', e.target.value)} style={fieldStyle} /></Field>
          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="Description (English)"><textarea rows={2} value={form.desc_en} onChange={e => {
 set('desc_en', e.target.value)
 set('desc_ta', transliterateText(e.target.value))
}} style={{ ...fieldStyle, resize: 'vertical' }} /></Field>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="Description (Tamil)"><textarea rows={2} value={form.desc_ta} onChange={e => set('desc_ta', e.target.value)} style={{ ...fieldStyle, resize: 'vertical' }} /></Field>
          </div>
        </div>

        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 14, alignItems: 'center' }}>
          <div style={{ width: 90, height: 115, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--line)', background: '#efe6d6', display: 'grid', placeItems: 'center' }}>
            {shownImage
              ? <img src={shownImage} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: 11, color: 'var(--smoke)' }}>no photo</span>}
          </div>
          <div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <label style={{ display: 'inline-flex', padding: '10px 14px', border: '1px solid var(--ink)', borderRadius: 999, background: 'var(--paper)', fontWeight: 600, fontSize: 13, cursor: 'pointer', gap: 6, alignItems: 'center' }}>
                <Upload size={14} /> {product.image ? 'Replace photo' : 'Add photo'}
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={pickFile} style={{ display: 'none' }} />
              </label>
              {(file || (product.image && !removeImage)) && (
                <button type="button" onClick={() => { setFile(null); setPreview(null); setRemoveImage(true) }} style={{ padding: '10px 14px', borderRadius: 999, border: '1px solid var(--line)', background: 'var(--paper)', fontWeight: 600, fontSize: 13, cursor: 'pointer', color: 'var(--smoke)' }}>
                  Remove photo
                </button>
              )}
            </div>
            <p style={{ fontSize: 11.5, color: 'var(--smoke)', marginTop: 6 }}>Resized to ≤1200px WebP, stored in the public bucket.</p>
          </div>
        </div>

        <div style={{ marginTop: 18, display: 'flex', gap: 18, flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, fontWeight: 600 }}>
            <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} />
            Visible on the shop
          </label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, fontWeight: 600 }}>
            <input type="checkbox" checked={form.featured} onChange={e => set('featured', e.target.checked)} />
            Featured on home
          </label>
        </div>

        {error && <ReadError message={error} />}

        <div style={{ marginTop: 18, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} disabled={busy} style={{ padding: '11px 20px', borderRadius: 999, border: '1px solid var(--line)', background: 'var(--paper)', fontWeight: 600, fontSize: 13.5, cursor: busy ? 'not-allowed' : 'pointer', color: 'var(--smoke)' }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={busy} style={{ padding: '11px 24px', borderRadius: 999, background: 'var(--ink)', color: 'var(--paper)', border: 0, fontWeight: 700, fontSize: 13.5, cursor: busy ? 'not-allowed' : 'pointer' }}>
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ProductRow({ product, onEdit, onToggleActive, onDelete, loading }: { product: Product; onEdit: () => void; onToggleActive: () => void; onDelete: () => void; loading: boolean }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, padding: '12px 0', borderTop: '1px solid var(--line)' }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ width: 70, height: 90, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--line)', background: '#efe6d6', flexShrink: 0, position: 'relative' }}>
          {product.image ? (
            <img src={product.image} alt={product.name_en} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { const t = e.currentTarget as HTMLImageElement; t.src = 'data:image/svg+xml,%3Csvg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"%3E%3Crect width=\"100\" height=\"100\" fill=\"#efe6d6\"/%3E%3C/svg%3E' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: 'var(--smoke)', fontSize: 10 }}>no img</div>
          )}
          {!product.active && <span style={{ position: 'absolute', top: 4, right: 4, background: 'var(--ink)', color: 'var(--paper)', fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 999 }}>hidden</span>}
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>{product.name_en}</span>
            <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--ink)' }}>{formatINR(product.price)}</span>
            <span style={{ fontSize: 11, color: 'var(--smoke)' }}>{product.name_ta}</span>
            {product.badge && <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '2px 8px', borderRadius: 999, background: 'var(--ink)', color: 'var(--paper)' }}>{String(product.badge)}</span>}
          </div>
          <div style={{ marginTop: 2, fontSize: 12, color: 'var(--smoke)' }}>
            {product.color_en}{product.color_hex && product.color_hex !== '#000000' ? <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: product.color_hex, border: '1px solid var(--line)', marginLeft: 6, verticalAlign: 'middle' }} /> : ''} · {product.category} · stock {product.stock} · {product.featured ? 'featured' : ''} {product.active ? '' : '(hidden)'}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
        <button onClick={onEdit} style={{ padding: '7px 12px', borderRadius: 999, border: '1px solid var(--line)', background: 'var(--paper)', fontWeight: 600, fontSize: 12, cursor: 'pointer', color: 'var(--ink)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Pencil size={12} /> Edit
        </button>
        <button onClick={onToggleActive} disabled={loading} style={{ padding: '7px 12px', borderRadius: 999, border: '1px solid var(--line)', background: 'var(--paper)', fontWeight: 600, fontSize: 12, cursor: loading ? 'not-allowed' : 'pointer', color: 'var(--smoke)' }}>
          {product.active ? 'Hide' : 'Show'}
        </button>
        <button onClick={onDelete} disabled={loading} style={{ padding: '7px 12px', borderRadius: 999, border: 0, background: 'var(--rust)', color: '#fff', fontWeight: 600, fontSize: 12, cursor: loading ? 'not-allowed' : 'pointer' }}>
          <Trash2 size={12} style={{ display: 'inline', marginRight: 3 }} />Delete
        </button>
      </div>
    </div>
  )
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
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

function StaffPanel() {
  const [rows, setRows] = useState<StaffMember[]>([])
  const [email, setEmail] = useState('')
  const [label, setLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function load() {
    try {
      setRows(await fetchStaff())
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  useEffect(() => { load() }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await addStaff(email, label)
      setNotice(`${email.trim().toLowerCase()} can now sign in to /admin.`)
      setEmail('')
      setLabel('')
      await load()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function toggle(member: StaffMember) {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await updateStaff(member.email, { active: !member.active })
      await load()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function remove(member: StaffMember) {
    if (!window.confirm(`Remove ${member.email} from staff?`)) return
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await removeStaff(member.email)
      await load()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Section title="Add staff" hint="They keep their own login — this only grants access">
        <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14, alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--smoke)', display: 'block', marginBottom: 4 }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="staff@example.com"
              style={{ width: '100%', padding: '10px 13px', border: '1px solid var(--line)', borderRadius: 12, fontSize: 14, background: 'var(--shell)', color: 'var(--ink)' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--smoke)', display: 'block', marginBottom: 4 }}>Label (optional)</label>
            <input
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="e.g. Print desk"
              style={{ width: '100%', padding: '10px 13px', border: '1px solid var(--line)', borderRadius: 12, fontSize: 14, background: 'var(--shell)', color: 'var(--ink)' }}
            />
          </div>
          <button type="submit" disabled={busy} style={{ padding: '11px 22px', borderRadius: 999, background: 'var(--ink)', color: 'var(--paper)', border: 0, fontWeight: 700, fontSize: 13.5, cursor: busy ? 'not-allowed' : 'pointer', height: 42 }}>
            {busy ? 'Saving…' : <><Plus size={14} style={{ display: 'inline', marginRight: 5 }} />Add staff</>}
          </button>
        </form>
        <p style={{ marginTop: 12, fontSize: 12.5, color: 'var(--smoke)', lineHeight: 1.6 }}>
          Staff sign in with this email at <code>/login</code> using their own password — they create the account once via
          {' '}<span style={{ color: 'var(--ink)' }}>Create account</span>, or you add them in
          {' '}Supabase → Authentication → Users. Access starts on their next page load.
        </p>
        {notice && <p style={{ marginTop: 10, fontSize: 12.5, color: '#1e6b3a' }}>{notice}</p>}
        {error && <ReadError message={error} />}
      </Section>

      <div style={{ height: 16 }} />

      <Section title="People with admin access" hint={`${rows.length} on the list`}>
        {rows.length === 0 && <p style={{ color: 'var(--smoke)', fontSize: 13 }}>Nobody added yet.</p>}
        {rows.map(member => (
          <div key={member.email} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, padding: '12px 0', borderTop: '1px solid var(--line)', alignItems: 'center' }}>
            <div>
              <p style={{ fontWeight: 600, fontSize: 14 }}>
                {member.email}
                <span style={{ marginLeft: 8, fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '2px 8px', borderRadius: 999, background: member.role === 'owner' ? 'var(--ink)' : 'var(--shell)', color: member.role === 'owner' ? 'var(--paper)' : 'var(--smoke)' }}>
                  {member.role}
                </span>
                {!member.active && (
                  <span style={{ marginLeft: 6, fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '2px 8px', borderRadius: 999, background: '#fbeae6', color: 'var(--rust)' }}>paused</span>
                )}
              </p>
              {member.label && <p style={{ fontSize: 12, color: 'var(--smoke)', marginTop: 2 }}>{member.label}</p>}
            </div>
            {member.role === 'owner' ? (
              <span style={{ fontSize: 12, color: 'var(--smoke)' }}>you</span>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => toggle(member)} disabled={busy} style={{ padding: '7px 14px', borderRadius: 999, border: '1px solid var(--line)', background: 'var(--paper)', fontWeight: 600, fontSize: 12.5, cursor: busy ? 'not-allowed' : 'pointer', color: 'var(--smoke)' }}>
                  {member.active ? 'Pause' : 'Restore'}
                </button>
                <button onClick={() => remove(member)} disabled={busy} style={{ padding: '7px 14px', borderRadius: 999, border: '1px solid var(--line)', background: 'var(--paper)', fontWeight: 600, fontSize: 12.5, cursor: busy ? 'not-allowed' : 'pointer', color: 'var(--rust)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <Trash2 size={13} /> Remove
                </button>
              </div>
            )}
          </div>
        ))}
      </Section>
    </>
  )
}

function ReadError({ message }: { message: string }) {
  return <p style={{ color: 'var(--rust)', fontSize: 12.5, marginTop: 8 }}>⚠ {message}</p>
}

const ORDER_STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  placed:     { bg: '#fff6de', text: '#8c5e00', border: '#e6d08a' },
  processing: { bg: '#e9eefb', text: '#1e40af', border: '#b8cbee' },
  shipped:    { bg: '#e6f2f6', text: '#0e7490', border: '#a5d7e8' },
  delivered:  { bg: '#e9f3e6', text: '#15803d', border: '#b2deb1' },
  cancelled:  { bg: '#fbeae6', text: '#b91c1c', border: '#f7c2b6' },
}

function OrdersPanel() {
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'placed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'>('all')
  const [search, setSearch] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [statusDraft, setStatusDraft] = useState<Record<string, string>>({})
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({})
  const [feedback, setFeedback] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAdminOrders()
      setOrders(data)
    } catch (e: any) {
      setError(e?.message || 'Could not load orders.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleUpdateStatus(order: AdminOrder) {
    const nextStatus = statusDraft[order.id] || order.status
    const note = noteDraft[order.id] || ''
    setUpdatingId(order.id)
    try {
      await updateAdminOrderStatus(order.id, nextStatus, note)
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: nextStatus as any } : o))
      setFeedback(`Order ${order.order_number} updated to ${nextStatus.toUpperCase()}!`)
      setTimeout(() => setFeedback(null), 4000)
    } catch (err: any) {
      alert(`Update failed: ${err.message}`)
    } finally {
      setUpdatingId(null)
    }
  }

  function getWhatsAppUrl(order: AdminOrder) {
    const cleanPhone = order.phone.replace(/[^0-9]/g, '')
    const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone
    const trackUrl = `${window.location.origin}/track`
    const statusMsg = order.status === 'processing'
      ? 'is now being printed & packed in our studio 🎨'
      : order.status === 'shipped'
      ? 'has left our studio and is on its way to you! 🚚'
      : order.status === 'delivered'
      ? 'has been delivered. We hope you love your tee! ✨'
      : order.status === 'cancelled'
      ? 'has been cancelled.'
      : 'is received and confirmed! ✅'

    const text = `Hi ${order.customer_name}! Your IJAZ LEGACY order #${order.order_number} ${statusMsg}\n\nTrack your order status anytime here: ${trackUrl}\nThank you for shopping with IJAZ LEGACY!`
    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`
  }

  const filteredOrders = orders.filter(o => {
    if (filter !== 'all' && o.status !== filter) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      o.order_number.toLowerCase().includes(q) ||
      o.customer_name.toLowerCase().includes(q) ||
      o.phone.includes(q) ||
      o.city.toLowerCase().includes(q) ||
      o.pincode.includes(q)
    )
  })

  const counts = {
    all: orders.length,
    placed: orders.filter(o => o.status === 'placed').length,
    processing: orders.filter(o => o.status === 'processing').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
  }

  return (
    <div>
      {/* Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'All Orders', count: counts.all, color: 'var(--ink)' },
          { label: 'New Placed', count: counts.placed, color: '#8c5e00' },
          { label: 'In Printing', count: counts.processing, color: '#1e40af' },
          { label: 'Shipped', count: counts.shipped, color: '#0e7490' },
          { label: 'Delivered', count: counts.delivered, color: '#15803d' },
        ].map((stat, i) => (
          <div key={i} style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 16, padding: '12px 14px' }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--smoke)' }}>{stat.label}</span>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: stat.color, marginTop: 4 }}>{stat.count}</p>
          </div>
        ))}
      </div>

      {feedback && (
        <div style={{ padding: '10px 14px', borderRadius: 12, background: '#eaf7ee', color: '#1e6b3a', fontSize: 13, marginBottom: 14, fontWeight: 600 }}>
          ✓ {feedback}
        </div>
      )}

      {/* Toolbar: Filters & Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(['all', 'placed', 'processing', 'shipped', 'delivered', 'cancelled'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              style={{
                padding: '7px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: `1px solid ${filter === tab ? 'var(--ink)' : 'var(--line)'}`,
                background: filter === tab ? 'var(--ink)' : 'var(--paper)',
                color: filter === tab ? 'var(--paper)' : 'var(--smoke)',
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)} ({counts[tab]})
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search order #, customer, phone…"
            style={{ padding: '8px 12px', borderRadius: 999, border: '1px solid var(--line)', background: 'var(--paper)', fontSize: 13, minWidth: 220 }}
          />
          <button
            onClick={load}
            disabled={loading}
            title="Refresh orders"
            style={{ width: 34, height: 34, borderRadius: '50%', border: '1px solid var(--line)', background: 'var(--paper)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {loading && orders.length === 0 ? (
        <p style={{ color: 'var(--smoke)', padding: 30, textAlign: 'center' }}>Loading customer orders…</p>
      ) : error ? (
        <div style={{ padding: 20, background: '#fdf0ec', border: '1px solid #f6cfc3', borderRadius: 16, color: 'var(--rust)' }}>
          <p style={{ fontWeight: 700 }}>Error loading orders</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>{error}</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 20 }}>
          <p style={{ color: 'var(--smoke)', fontSize: 14 }}>No orders found for this view.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filteredOrders.map(order => {
            const currentStatus = statusDraft[order.id] || order.status
            const statusStyle = ORDER_STATUS_COLORS[order.status] || { bg: '#f0f0f0', text: '#333', border: '#ccc' }
            const isCustom = order.items?.some(it => it.kind === 'custom')
            const isUpdating = updatingId === order.id

            return (
              <div
                key={order.id}
                style={{
                  background: 'var(--paper)', border: '1px solid var(--line)',
                  borderRadius: 20, padding: 18, transition: 'box-shadow 0.15s ease'
                }}
              >
                {/* Order Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, paddingBottom: 12, borderBottom: '1px solid var(--line)' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17, color: 'var(--ink)' }}>
                        {order.order_number}
                      </span>
                      <span style={{
                        padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                        background: statusStyle.bg, color: statusStyle.text, border: `1px solid ${statusStyle.border}`
                      }}>
                        {order.status}
                      </span>
                      {isCustom && (
                        <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 10.5, fontWeight: 700, background: '#f5e8ff', color: '#6b21a8', border: '1px solid #d8b4fe' }}>
                          Custom Tee 🎨
                        </span>
                      )}
                    </div>
                    <p style={{ color: 'var(--smoke)', fontSize: 12, marginTop: 4 }}>
                      Placed {new Date(order.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, color: 'var(--ink)' }}>
                      {formatINR(order.total)}
                    </span>
                    <p style={{ fontSize: 11, color: 'var(--smoke)', textTransform: 'uppercase', fontWeight: 600 }}>
                      Payment: {order.payment_method?.toUpperCase() || 'COD'}
                    </p>
                  </div>
                </div>

                {/* Customer & Delivery Information */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16, marginTop: 14 }}>
                  <div style={{ background: 'var(--shell)', borderRadius: 14, padding: 12 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--smoke)', marginBottom: 6 }}>
                      Customer Contact
                    </p>
                    <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{order.customer_name}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <a href={`tel:${order.phone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--rust)', fontSize: 13, fontWeight: 600 }}>
                        <Phone size={13} /> {order.phone}
                      </a>
                      <a
                        href={getWhatsAppUrl(order)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '3px 8px', borderRadius: 999, background: '#25D366',
                          color: '#fff', fontSize: 11, fontWeight: 700, textDecoration: 'none'
                        }}
                        title="Chat & update on WhatsApp"
                      >
                        <MessageSquare size={11} /> WhatsApp
                      </a>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4, marginTop: 8, fontSize: 12.5, color: 'var(--smoke)' }}>
                      <MapPin size={13} style={{ flexShrink: 0, marginTop: 2 }} />
                      <span>{order.address1}{order.address2 ? `, ${order.address2}` : ''}, {order.city}, {order.state} – {order.pincode}</span>
                    </div>
                  </div>

                  {/* Items Ordered */}
                  <div style={{ background: 'var(--shell)', borderRadius: 14, padding: 12 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--smoke)', marginBottom: 6 }}>
                      Items ({order.items?.length || 0})
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(order.items ?? []).map(it => {
                        const parsedConfig = typeof it.custom_config === 'string' ? JSON.parse(it.custom_config) : it.custom_config
                        const placements = parsedConfig?.placements || []
                        return (
                          <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12.5, borderBottom: '1px dashed var(--line)', paddingBottom: 6 }}>
                            <div>
                              <p style={{ fontWeight: 700, color: 'var(--ink)' }}>
                                {it.name_en} <span style={{ fontWeight: 400, color: 'var(--smoke)' }}>× {it.quantity}</span>
                              </p>
                              <p style={{ color: 'var(--smoke)', fontSize: 11.5 }}>
                                Size {it.size} · {it.color_en}
                              </p>
                              {placements.length > 0 && (
                                <p style={{ color: '#6b21a8', fontSize: 11, fontWeight: 600, marginTop: 2 }}>
                                  Prints: {placements.length} items placed on tee
                                </p>
                              )}
                            </div>
                            <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{formatINR(it.unit_price * it.quantity)}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Status Update & Customer Communication Panel */}
                <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  {/* Status Dropdown & Note */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--smoke)' }}>Change Status:</span>
                    <select
                      value={currentStatus}
                      onChange={e => setStatusDraft(prev => ({ ...prev, [order.id]: e.target.value }))}
                      style={{
                        padding: '7px 12px', borderRadius: 10, border: '1px solid var(--line)',
                        background: 'var(--paper)', fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', cursor: 'pointer'
                      }}
                    >
                      <option value="placed">Placed (Confirmed)</option>
                      <option value="processing">Processing (In Printing & Packing)</option>
                      <option value="shipped">Shipped (Dispatched)</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>

                    <input
                      type="text"
                      placeholder="Optional status note / tracking #…"
                      value={noteDraft[order.id] || ''}
                      onChange={e => setNoteDraft(prev => ({ ...prev, [order.id]: e.target.value }))}
                      style={{ padding: '7px 12px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--shell)', fontSize: 12, minWidth: 200 }}
                    />

                    <button
                      onClick={() => handleUpdateStatus(order)}
                      disabled={isUpdating}
                      style={{
                        padding: '7px 16px', borderRadius: 999, background: 'var(--ink)',
                        color: 'var(--paper)', border: 0, fontWeight: 700, fontSize: 12.5, cursor: 'pointer'
                      }}
                    >
                      {isUpdating ? 'Updating…' : 'Update status'}
                    </button>
                  </div>

                  {/* 1-Click WhatsApp Customer Update */}
                  <a
                    href={getWhatsAppUrl(order)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '8px 16px', borderRadius: 999, background: '#25D366',
                      color: '#fff', fontSize: 12.5, fontWeight: 700, textDecoration: 'none',
                      boxShadow: '0 2px 6px rgba(37,211,102,.25)'
                    }}
                  >
                    <MessageSquare size={13} />
                    Send WhatsApp Update to Customer
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function Admin() {
  const { user, loading: authLoading } = useAuth()
  const { ready: roleReady, isStaff, isOwner } = useStaffAccess()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'stickers' | 'staff' | 'not-configured'>('not-configured')
  const [products, setProducts] = useState<Product[]>([])
  const [stickers, setStickers] = useState<Sticker[]>([])
  const [productsError, setProductsError] = useState<string | null>(null)
  const [stickersError, setStickersError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)
 const [editing, setEditing] = useState<Product | null>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'hidden'>('all')
  const [flash, setFlash] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const imageInputRef = useRef<HTMLInputElement>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageUploading, setImageUploading] = useState(false)
  const [imageInfo, setImageInfo] = useState<{ w: number; h: number } | null>(null)

  async function loadImagePreview(file: File) {
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    const img = new Image()
    await new Promise<void>(res => { img.onload = () => { setImageInfo({ w: img.naturalWidth, h: img.naturalHeight }); res() } })
    URL.revokeObjectURL(img.src)
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setImageUploading(true)
    try {
      await loadImagePreview(f)
      setSaved(null)
    } finally {
      setImageUploading(false)
    }
  }

  function clearImage() {
    setImageFile(null)
    setImagePreview(null)
    setImageInfo(null)
    if (imageInputRef.current) imageInputRef.current.value = ''
  }

  // ── Product form ──────────────────────────────────────────────────────────
  const [p, setP] = useState<Record<string, unknown>>({
    nameEn: '', nameTa: '',
    descEn: '', descTa: '',
    price: 699, colorEn: 'Sand', colorTa: 'சாண்ட்', colorHex: '#D8C2A4',
    category: 'nature', badge: 'bestseller', featured: true, stock: 25,
    slug: '',
  })

  function setPField<K extends keyof typeof p>(k: K, v: (typeof p)[K]) { setP(prev => ({ ...prev, [k]: v })) }

  async function handleSaveProduct() {
    if (!p.nameEn || !(p.nameEn as string).trim()) { setFlash({ kind: 'err', text: 'Product name (EN) is required.' }); return }
    if ((p.price as number) < 0) { setFlash({ kind: 'err', text: 'Price must be 0 or more.' }); return }
    setLoading(true)
    setSaved(null)
    try {
      const { product, uploadedPath, fallback } = await saveProduct({
        nameEn: p.nameEn as string,
        nameTa: p.nameTa as string,
        descEn: p.descEn as string,
        descTa: p.descTa as string,
        price: p.price as number,
        colorEn: p.colorEn as string,
        colorTa: p.colorTa as string,
        colorHex: p.colorHex as string,
        category: p.category as string,
        badge: p.badge as string | null,
        featured: p.featured as boolean,
        stock: p.stock as number,
        slug: p.slug as string | undefined,
        imageFile: imageFile ?? undefined,
      })
      setSaved(`Saved ${product.slug} · ${formatINR(product.price)}`)
      setFlash({ kind: 'ok', text: fallback
        ? 'Saved — image kept inside the row (Supabase storage blocked the upload). It will still show on the site.'
        : `Saved — image at ${uploadedPath}` })
      clearImage()
      refresh()
    } catch (e: any) {
      setFlash({ kind: 'err', text: e?.message || 'Save failed.' })
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteProduct(slug: string) {
    if (!confirm(`Delete “${slug}”? This cannot be undone.`)) return
    try {
      await deleteProduct(slug)
      setFlash({ kind: 'ok', text: `Deleted ${slug}.` })
      refresh()
    } catch (e: any) {
      setFlash({ kind: 'err', text: e?.message || 'Delete failed.' })
    }
  }

  async function handleToggleActive(product: Product) {
    try {
      await updateProduct(product.slug, { active: !product.active })
      setFlash({ kind: 'ok', text: `${product.active ? 'Hidden' : 'Restored'} ${product.slug}.` })
      refresh()
    } catch (e: any) {
      setFlash({ kind: 'err', text: e?.message || 'Update failed.' })
    }
  }

  async function handlePasteImageUrl(url: string) {
    if (!url.trim()) return
    setImagePreview(url)
    setImageFile(null)
    setSaved(null)
    setFlash({ kind: 'ok', text: 'Image URL noted — will be saved with the product.' })
  }

  // ── Sticker form ──────────────────────────────────────────────────────────
  const [s, setS] = useState<{
    nameEn: string
    nameTa: string
    category: 'small' | 'medium' | 'large'
    imageFile: File | null
  }>({ nameEn: '', nameTa: '', category: 'medium', imageFile: null })
  const [sPreview, setSPreview] = useState<string | null>(null)
  const [sInfo, setSInfo] = useState<{ w: number; h: number } | null>(null)
  const sInputRef = useRef<HTMLInputElement>(null)

  async function loadSPreview(file: File) {
    setS({ ...s, imageFile: file })
    setSPreview(URL.createObjectURL(file))
    const img = new Image()
    await new Promise<void>(res => { img.onload = () => { setSInfo({ w: img.naturalWidth, h: img.naturalHeight }); res() } })
    URL.revokeObjectURL(img.src)
  }

  async function handleSImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setLoading(true)
    try { await loadSPreview(f) } finally { setLoading(false) }
  }

  async function handleSaveSticker() {
    if (!s.nameEn.trim()) { setFlash({ kind: 'err', text: 'Sticker name (EN) is required.' }); return }
    setLoading(true)
    try {
      const { sticker, uploadedPath, fallback } = await saveSticker({
        nameEn: s.nameEn, nameTa: s.nameTa,
        category: s.category,
        imageFile: s.imageFile ?? undefined,
      })
      setSaved(`Sticker saved · ${sticker.name_en}`)
      setFlash({ kind: 'ok', text: fallback
        ? 'Sticker saved — image kept inside the row (storage blocked). It still shows in the studio.'
        : `Sticker saved — image at ${uploadedPath}` })
      clearSPreview()
      refresh()
    } catch (e: any) {
      setFlash({ kind: 'err', text: e?.message || 'Sticker save failed.' })
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteSticker(id: string) {
    if (!confirm('Delete this sticker?')) return
    try {
      await deleteSticker(id)
      setFlash({ kind: 'ok', text: 'Sticker deleted.' })
      refresh()
    } catch (e: any) {
      setFlash({ kind: 'err', text: e?.message || 'Delete failed.' })
    }
  }

  function clearSPreview() {
    setSPreview(null)
    setSInfo(null)
    setS(prev => ({ ...prev, imageFile: null }))
    if (sInputRef.current) sInputRef.current.value = ''
  }

  // ── DB readiness check ────────────────────────────────────────────────────
  async function refresh() {
    setLoading(true)
    try {
      const [{ data: prods, error: prodErr }, { data: sts, error: stsErr }] = await Promise.all([
        supabase.from('products').select('*').order('sort_order').order('updated_at', { ascending: false }),
        supabase.from('stickers').select('*').order('sort_order'),
      ])
      if (prodErr || stsErr) {
        setProductsError(prodErr?.message ?? stsErr?.message ?? 'Could not load products/stickers.')
        return
      }
      setProductsError(null)
      setStickersError(null)
      setProducts(prods ?? [])
      setStickers(sts ?? [])
      // Tables exist — leave the one-time setup screen for the real admin tabs.
      setActiveTab(t => (t === 'not-configured' ? 'orders' : t))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  // Redirect old /upload hits to /admin
  useEffect(() => {
    if (window.location.pathname === '/upload') navigate('/admin', { replace: true })
  }, [navigate])

  // ── Auth gate ─────────────────────────────────────────────────────────────
  if (authLoading || (user && !roleReady)) return <p style={{ padding: 80, color: 'var(--smoke)' }}>Loading…</p>
  if (!user || !isStaff) {
    return (
      <div style={{ maxWidth: 440, margin: '60px auto', padding: '0 16px', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28 }}>Admin access</h1>
        <p style={{ color: 'var(--smoke)', marginTop: 6 }}>Only the owner and staff can open this page.</p>
        <Link to="/login?next=/admin" style={{ display: 'inline-block', marginTop: 16, padding: '11px 22px', background: 'var(--ink)', color: 'var(--paper)', borderRadius: 999, fontWeight: 700, fontSize: 14 }}>Sign in as admin</Link>
      </div>
    )
  }

  // ── Configure-first view ──────────────────────────────────────────────────
  if (activeTab === 'not-configured')
    return (
      <div style={{ maxWidth: 680, margin: '40px auto', padding: '0 16px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, letterSpacing: '-0.025em' }}>Admin · configure first</h1>
        <p style={{ color: 'var(--smoke)', marginTop: 6, lineHeight: 1.6 }}>
          Your database doesn't have the <code>products</code> or <code>stickers</code> tables yet, so the admin page can't write anything right now.
        </p>

        {productsError && (
          <p style={{ marginTop: 12, padding: '10px 14px', background: 'var(--shell)', border: '1px solid var(--line)', borderRadius: 12, color: 'var(--rust)', fontSize: 12.5 }}>
            Supabase said: {productsError}
          </p>
        )}

        <div style={{ marginTop: 20, background: 'var(--shell)', border: '1px solid var(--line)', borderRadius: 16, padding: 18 }}>
          <p style={{ fontWeight: 700, marginBottom: 8 }}>Do this once (takes about 30 seconds):</p>
          <ol style={{ paddingLeft: 22, color: 'var(--smoke)', lineHeight: 1.7, fontSize: 13.5 }}>
            <li>Open your Supabase project dashboard.</li>
            <li>Go to <b>SQL Editor</b> → <b>New query</b>.</li>
            <li>Open <code style={{ color: 'var(--ink)' }}>supabase-admin.sql</code> from this project and paste every line into the editor.</li>
            <li>Click <b>Run</b>.</li>
          </ol>
          <p style={{ marginTop: 12, color: 'var(--smoke)', fontSize: 12.5 }}>
            Then refresh this page — the Products and Stickers tabs will appear, and anything you create here will show up live on the shop and custom studio.
          </p>
        </div>

        <p style={{ marginTop: 16, fontSize: 12.5, color: 'var(--smoke)' }}>
          Need the file? It's called <code style={{ color: 'var(--ink)' }}>supabase-admin.sql</code> in your project folder — same place as <code style={{ color: 'var(--ink)' }}>supabase-seed.sql</code>.
        </p>
      </div>
    )

  // ── Main admin UI ─────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '24px 16px 60px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, letterSpacing: '-0.025em' }}>Admin</h1>
          <p style={{ color: 'var(--smoke)', fontSize: 13, marginTop: 4 }}>
            {user.email} · {isOwner ? 'Owner' : 'Staff'} · Create products and stickers — they show up on the site immediately.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setActiveTab('orders')} style={{ padding: '8px 16px', borderRadius: 999, border: '1px solid var(--line)', background: activeTab === 'orders' ? 'var(--ink)' : 'var(--paper)', color: activeTab === 'orders' ? 'var(--paper)' : 'var(--smoke)', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Package size={14} /> Orders
          </button>
          <button onClick={() => { setActiveTab('products'); refresh() }} style={{ padding: '8px 16px', borderRadius: 999, border: '1px solid var(--line)', background: activeTab === 'products' ? 'var(--ink)' : 'var(--paper)', color: activeTab === 'products' ? 'var(--paper)' : 'var(--smoke)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Products</button>
          <button onClick={() => { setActiveTab('stickers'); refresh() }} style={{ padding: '8px 16px', borderRadius: 999, border: '1px solid var(--line)', background: activeTab === 'stickers' ? 'var(--ink)' : 'var(--paper)', color: activeTab === 'stickers' ? 'var(--paper)' : 'var(--smoke)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Stickers</button>
          {isOwner && (
            <button onClick={() => setActiveTab('staff')} style={{ padding: '8px 16px', borderRadius: 999, border: '1px solid var(--line)', background: activeTab === 'staff' ? 'var(--ink)' : 'var(--paper)', color: activeTab === 'staff' ? 'var(--paper)' : 'var(--smoke)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Staff</button>
          )}
        </div>
      </div>

      {flash && (
        <div style={{ padding: 12, borderRadius: 12, background: flash.kind === 'ok' ? '#eaf7ee' : '#fbeae6', color: flash.kind === 'ok' ? '#1e6b3a' : 'var(--rust)', fontSize: 13, marginBottom: 14 }}>
          {flash.text}
        </div>
      )}
      {saved && (
        <div style={{ padding: 10, borderRadius: 12, background: '#fffdf9', border: '1px solid var(--line)', color: 'var(--ink)', fontSize: 13, marginBottom: 14 }}>
          {saved}
        </div>
      )}

      {activeTab === 'orders' && <OrdersPanel />}

      {activeTab === 'products' && (
        <>
          {/* ── New product form ───────────────────────────────────────── */}
          <Section title="New product" hint="Everything you fill in here goes live the moment you save.">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--smoke)', display: 'block', marginBottom: 4 }}>Name (English)</label>
                <input value={p.nameEn as string} onChange={e => setPField('nameEn', e.target.value)} placeholder="e.g. Kadal Dawn" style={{ width: '100%', padding: '10px 13px', border: '1px solid var(--line)', borderRadius: 12, fontSize: 14, background: 'var(--shell)', color: 'var(--ink)' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--smoke)', display: 'block', marginBottom: 4 }}>Name (Tamil)</label>
                <input value={p.nameTa as string} onChange={e => setPField('nameTa', e.target.value)} placeholder="கடல் விடியல்" style={{ width: '100%', padding: '10px 13px', border: '1px solid var(--line)', borderRadius: 12, fontSize: 14, background: 'var(--shell)', color: 'var(--ink)' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--smoke)', display: 'block', marginBottom: 4 }}>Price (₹)</label>
                <input type="number" min="0" step="1" value={p.price as number} onChange={e => setPField('price', Number(e.target.value))} style={{ width: '100%', padding: '10px 13px', border: '1px solid var(--line)', borderRadius: 12, fontSize: 14, background: 'var(--shell)', color: 'var(--ink)' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--smoke)', display: 'block', marginBottom: 4 }}>Stock</label>
                <input type="number" min="0" step="1" value={p.stock as number} onChange={e => setPField('stock', Math.max(0, Number(e.target.value)))} style={{ width: '100%', padding: '10px 13px', border: '1px solid var(--line)', borderRadius: 12, fontSize: 14, background: 'var(--shell)', color: 'var(--ink)' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--smoke)', display: 'block', marginBottom: 4 }}>Colour name (EN)</label>
                <input value={p.colorEn as string} onChange={e => setPField('colorEn', e.target.value)} placeholder="e.g. Sand" style={{ width: '100%', padding: '10px 13px', border: '1px solid var(--line)', borderRadius: 12, fontSize: 14, background: 'var(--shell)', color: 'var(--ink)' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--smoke)', display: 'block', marginBottom: 4 }}>Colour name (TA)</label>
                <input value={p.colorTa as string} onChange={e => setPField('colorTa', e.target.value)} placeholder="சாண்ட்" style={{ width: '100%', padding: '10px 13px', border: '1px solid var(--line)', borderRadius: 12, fontSize: 14, background: 'var(--shell)', color: 'var(--ink)' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--smoke)', display: 'block', marginBottom: 4 }}>Colour hex</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={p.colorHex as string} onChange={e => setPField('colorHex', e.target.value)} placeholder="#D8C2A4" style={{ width: '100%', padding: '10px 13px', border: '1px solid var(--line)', borderRadius: 12, fontSize: 14, background: 'var(--shell)', color: 'var(--ink)' }} />
                  <span style={{ width: 40, height: 40, borderRadius: 8, background: p.colorHex as string, border: '1px solid var(--line)', display: 'grid', placeItems: 'center', fontSize: 10, color: ((p.colorHex as string) === '#000000' ? '#fff' : 'var(--ink)'), fontWeight: 700 }}>{(p.colorHex as string) || '#000'}</span>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--smoke)', display: 'block', marginBottom: 4 }}>Category</label>
                <select value={p.category as string} onChange={e => setPField('category', e.target.value)} style={{ width: '100%', padding: '10px 13px', border: '1px solid var(--line)', borderRadius: 12, fontSize: 14, background: 'var(--shell)', color: 'var(--ink)' }}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--smoke)', display: 'block', marginBottom: 4 }}>Badge</label>
                <select value={(p.badge as string | null) ?? ''} onChange={e => setPField('badge', e.target.value || null)} style={{ width: '100%', padding: '10px 13px', border: '1px solid var(--line)', borderRadius: 12, fontSize: 14, background: 'var(--shell)', color: 'var(--ink)' }}>
                  {BADGES.map(b => <option key={String(b)} value={b ?? ''}>{b ?? 'None'}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--smoke)', display: 'block', marginBottom: 4 }}>Slug (optional)</label>
                <input value={p.slug as string} onChange={e => setPField('slug', e.target.value)} placeholder="auto-generated if empty" style={{ width: '100%', padding: '10px 13px', border: '1px solid var(--line)', borderRadius: 12, fontSize: 14, background: 'var(--shell)', color: 'var(--ink)' }} />
                <p style={{ fontSize: 11, color: 'var(--smoke)', marginTop: 4 }}>Leave empty for an automatic slug from the English name.</p>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--smoke)', display: 'block', marginBottom: 4 }}>Image</label>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <label style={{ padding: '10px 14px', border: '1px solid var(--ink)', borderRadius: 999, background: 'var(--paper)', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, flex: '1 1 auto' }}>
                    <Upload size={14} /> Browse
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
                <p style={{ marginTop: 8, fontSize: 12, color: 'var(--smoke)' }}>
                  Or paste an already-hosted image URL instead of uploading.{' '}
                  <input value="" onChange={e => handlePasteImageUrl(e.target.value)} placeholder="https://...png" style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--line)', borderRadius: 8, fontSize: 12, background: 'var(--shell)', color: 'var(--ink)', display: 'block', marginTop: 4 }} />
                </p>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--smoke)', display: 'block', marginBottom: 4 }}>Description (English)</label>
                <textarea rows={2} value={p.descEn as string} onChange={e => setPField('descEn', e.target.value)} style={{ width: '100%', padding: '10px 13px', border: '1px solid var(--line)', borderRadius: 12, fontSize: 14, resize: 'none', background: 'var(--shell)', color: 'var(--ink)' }} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--smoke)', display: 'block', marginBottom: 4 }}>Description (Tamil)</label>
                <textarea rows={2} value={p.descTa as string} onChange={e => setPField('descTa', e.target.value)} style={{ width: '100%', padding: '10px 13px', border: '1px solid var(--line)', borderRadius: 12, fontSize: 14, resize: 'none', background: 'var(--shell)', color: 'var(--ink)' }} />
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={p.featured as boolean} onChange={e => setPField('featured', e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--ink)' }} />
                  Featured
                </label>
                <button onClick={handleSaveProduct} disabled={loading || imageUploading} style={{ padding: '11px 22px', borderRadius: 999, background: 'var(--ink)', color: 'var(--paper)', border: 0, fontWeight: 700, fontSize: 13.5, cursor: loading || imageUploading ? 'not-allowed' : 'pointer' }}>
                  {loading || imageUploading ? 'Saving…' : <><Plus size={14} style={{ display: 'inline', marginRight: 5 }} />Save product</>}
                </button>
              </div>
              {productsError && <ReadError message={productsError} />}
            </div>
          </Section>

          {/* ── Existing products list ─────────────────────────────────── */}
          <Section title="Products on the site" hint={`${products.filter(p => p.active).length} live · ${products.filter(p => !p.active).length} hidden`}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 6 }}>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search name, slug, colour…"
                style={{ flex: '1 1 220px', padding: '9px 13px', border: '1px solid var(--line)', borderRadius: 999, fontSize: 13.5, background: 'var(--shell)', color: 'var(--ink)' }}
              />
              {(['all', 'live', 'hidden'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  style={{ padding: '7px 14px', borderRadius: 999, border: '1px solid var(--line)', fontWeight: 600, fontSize: 12.5, cursor: 'pointer', background: statusFilter === f ? 'var(--ink)' : 'var(--paper)', color: statusFilter === f ? 'var(--paper)' : 'var(--smoke)', textTransform: 'capitalize' }}
                >
                  {f}
                </button>
              ))}
            </div>
            {loading && <p style={{ color: 'var(--smoke)', fontSize: 13 }}>Refreshing…</p>}
            {!loading && products.length === 0 && (
              <p style={{ color: 'var(--smoke)', fontSize: 13 }}>No products yet. Create one in the form above.</p>
            )}
            {!loading && products.length > 0 && (() => {
              const q = query.trim().toLowerCase()
              const visible = products.filter(p => {
                if (statusFilter === 'live' && !p.active) return false
                if (statusFilter === 'hidden' && p.active) return false
                if (!q) return true
                return [p.name_en, p.name_ta, p.slug, p.color_en, p.category, p.desc_en]
                  .some(v => (v ?? '').toString().toLowerCase().includes(q))
              })
              if (visible.length === 0) {
                return <p style={{ color: 'var(--smoke)', fontSize: 13 }}>No product matches “{query}”.</p>
              }
              return visible.map(product => (
                <ProductRow
                  key={product.slug}
                  product={product}
                  onEdit={() => setEditing(product)}
                  onToggleActive={() => handleToggleActive(product)}
                  onDelete={() => handleDeleteProduct(product.slug)}
                  loading={loading}
                />
              ))
            })()}
          </Section>
        </>
      )}

      {activeTab === 'stickers' && (
        <>
          {/* ── New sticker form ───────────────────────────────────────── */}
          <Section title="New sticker" hint="These show up in the custom studio under “Custom stickers”.">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--smoke)', display: 'block', marginBottom: 4 }}>Name (English)</label>
                <input value={s.nameEn} onChange={e => setS(prev => ({ ...prev, nameEn: e.target.value }))} placeholder="e.g. BMW M Badge" style={{ width: '100%', padding: '10px 13px', border: '1px solid var(--line)', borderRadius: 12, fontSize: 14, background: 'var(--shell)', color: 'var(--ink)' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--smoke)', display: 'block', marginBottom: 4 }}>Name (Tamil)</label>
                <input value={s.nameTa} onChange={e => setS(prev => ({ ...prev, nameTa: e.target.value }))} placeholder="பீம் எம் பேஜ்" style={{ width: '100%', padding: '10px 13px', border: '1px solid var(--line)', borderRadius: 12, fontSize: 14, background: 'var(--shell)', color: 'var(--ink)' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--smoke)', display: 'block', marginBottom: 4 }}>Size category</label>
                <select value={s.category} onChange={e => setS(prev => ({ ...prev, category: e.target.value as 'small' | 'medium' | 'large' }))} style={{ width: '100%', padding: '10px 13px', border: '1px solid var(--line)', borderRadius: 12, fontSize: 14, background: 'var(--shell)', color: 'var(--ink)' }}>
                  <option value="small">Small — logo / icon</option>
                  <option value="medium">Medium — half sheet</option>
                  <option value="large">Large — full sheet</option>
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--smoke)', display: 'block', marginBottom: 4 }}>Sticker image</label>
                <label style={{ display: 'inline-flex', padding: '10px 14px', border: '1px solid var(--ink)', borderRadius: 999, background: 'var(--paper)', fontWeight: 600, fontSize: 13, cursor: 'pointer', gap: 6, flex: '1 1 auto', alignItems: 'center' }}>
                  <Upload size={14} /> Browse
                  <input ref={sInputRef} id="s-image-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleSImageChange} style={{ display: 'none' }} />
                </label>
                {s.imageFile && (
                  <button type="button" onClick={clearSPreview} style={{ marginLeft: 8, padding: '10px 14px', borderRadius: 999, border: '1px solid var(--line)', background: 'var(--paper)', fontWeight: 600, fontSize: 13, cursor: 'pointer', color: 'var(--smoke)' }}>Clear</button>
                )}
                {sInfo && <span style={{ marginLeft: 10, fontSize: 12, color: 'var(--smoke)' }}>{sInfo.w}×{sInfo.h} · resized to ≤800px</span>}
                {sPreview && (
                  <div style={{ marginTop: 10, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--line)', maxWidth: 200, background: '#efe6d6' }}>
                    <img src={sPreview} alt="preview" style={{ width: '100%', display: 'block' }} />
                  </div>
                )}
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10, alignItems: 'center' }}>
                <button onClick={handleSaveSticker} disabled={loading} style={{ padding: '11px 22px', borderRadius: 999, background: 'var(--ink)', color: 'var(--paper)', border: 0, fontWeight: 700, fontSize: 13.5, cursor: loading ? 'not-allowed' : 'pointer' }}>
                  {loading ? 'Saving…' : <><Plus size={14} style={{ display: 'inline', marginRight: 5 }} />Save sticker</>}
                </button>
              </div>
              {stickersError && <ReadError message={stickersError} />}
            </div>
          </Section>

          {/* ── Sticker library list ───────────────────────────────────── */}
          <Section title="Stickers in the studio" hint={`${stickers.length} in database · tap a tile to remove`}>
            {loading && <p style={{ color: 'var(--smoke)', fontSize: 13 }}>Refreshing…</p>}
            {!loading && stickers.length === 0 && (
              <p style={{ color: 'var(--smoke)', fontSize: 13 }}>No stickers yet. Create one above — it will appear in the custom studio.</p>
            )}
            {stickers.map((sticker) => (
              <StickerTile key={sticker.id} sticker={sticker} onRemove={() => handleDeleteSticker(sticker.id)} loading={loading} />
            ))}
          </Section>
        </>
      )}

      {activeTab === 'staff' && isOwner && <StaffPanel />}

      {editing && (
        <ProductEditor
          product={editing}
          onClose={() => setEditing(null)}
          onSaved={message => { setSaved(message); refresh() }}
        />
      )}

      <div style={{ marginTop: 24, padding: 12, background: 'var(--shell)', borderRadius: 12, fontSize: 12, color: 'var(--smoke)' }}>
        <b style={{ color: 'var(--ink)' }}>Tip:</b> Anything you save here is written straight to the database, so it appears on the shop and custom studio immediately — no rebuild needed. Images are resized before saving so the site stays fast.
      </div>

      <style>{`
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type="number"] { -moz-appearance: textfield; }
      `}</style>
    </div>
  )
}
