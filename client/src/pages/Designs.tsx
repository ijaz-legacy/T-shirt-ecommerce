import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Pencil, ShoppingBag, Trash2, Zap, LayoutGrid, List, Search, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useLang } from '../context/LangContext'
import { Tee3DPreview } from '../components/three/Tee3DPreview'
import { deleteDesign, listDesigns, type SavedDesign } from '../lib/designs'
import { calcCustomUnitPrice, getFit, getTeeColor, getCategoryFromScale } from '../lib/catalog'
import { formatINR } from '../lib/currency'

export default function Designs() {
  const { user, loading: authLoading } = useAuth()
  const { addCustom } = useCart()
  const { lang } = useLang()
  const navigate = useNavigate()

  const [designs, setDesigns] = useState<SavedDesign[]>([])
  const [loading, setLoading] = useState(true)
  const [localOnly, setLocalOnly] = useState(false)
  const [added, setAdded] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (authLoading) return
    listDesigns(user ? user.id : 'guest').then(({ designs, localOnly }) => {
      setDesigns(designs)
      setLocalOnly(localOnly)
      setLoading(false)
    })
  }, [user, authLoading])

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this design?')) return
    await deleteDesign(user ? user.id : 'guest', id)
    setDesigns(prev => prev.filter(d => d.id !== id))
  }

  function handleAddToBag(d: SavedDesign) {
    addCustom({ fit: d.fit, size: d.size, colorId: d.colorId, placements: d.placements }, 1)
    setAdded(d.id)
    window.setTimeout(() => setAdded(cur => (cur === d.id ? null : cur)), 2500)
  }

  function handleBuyNow(d: SavedDesign) {
    addCustom({ fit: d.fit, size: d.size, colorId: d.colorId, placements: d.placements }, 1)
    navigate('/checkout')
  }

  const filteredDesigns = designs.filter(d =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.fit.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.colorId.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (authLoading || loading) {
    return (
      <div style={{ maxWidth: 1180, margin: '60px auto', padding: '0 16px', textAlign: 'center' }}>
        <p style={{ color: 'var(--smoke)', fontSize: 14 }}>Loading your designs…</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '32px 16px 60px' }}>
      {/* Header — Canva style */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 32, letterSpacing: '-0.025em' }}>
              Your designs
            </h1>
            <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: 'var(--shell)', color: 'var(--smoke)', border: '1px solid var(--line)' }}>
              {designs.length} {designs.length === 1 ? 'tee' : 'tees'}
            </span>
          </div>
          <p style={{ color: 'var(--smoke)', fontSize: 13.5, marginTop: 4 }}>
            Your custom creations · Edit in studio, duplicate, or order with 1-click.
          </p>
        </div>

        <Link
          to="/customize"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '11px 22px', borderRadius: 999, background: 'var(--ink)',
            color: 'var(--paper)', fontWeight: 700, fontSize: 13.5,
            boxShadow: '0 2px 6px rgba(23,21,18,.15)'
          }}
        >
          <Sparkles size={14} /> + Create new design
        </Link>
      </div>

      {/* Guest Notice */}
      {!user && (
        <div style={{ marginTop: 20, padding: '12px 16px', border: '1px solid #e6d9a8', background: '#fff9e6', borderRadius: 16, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <span>Your designs are saved safely in this browser. <Link to="/login?next=/designs" style={{ fontWeight: 700, textDecoration: 'underline', color: 'var(--ink)' }}>Sign in</Link> to sync them across your phone and laptop.</span>
        </div>
      )}

      {/* Toolbar: Search & View toggle (Grid / List like Canva) */}
      {designs.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginTop: 24, paddingBottom: 14, borderBottom: '1px solid var(--line)' }}>
          {/* Search */}
          <div style={{ position: 'relative', minWidth: 240, flex: '1 1 240px', maxWidth: 380 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--smoke)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search designs by name, fit, colour…"
              style={{
                width: '100%', padding: '9px 12px 9px 34px', borderRadius: 999,
                border: '1px solid var(--line)', background: 'var(--paper)',
                fontSize: 13, color: 'var(--ink)'
              }}
            />
          </div>

          {/* Grid / List switch like Canva */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--shell)', padding: 3, borderRadius: 999 }}>
            <button
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px',
                borderRadius: 999, border: 0, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: viewMode === 'grid' ? 'var(--paper)' : 'transparent',
                color: viewMode === 'grid' ? 'var(--ink)' : 'var(--smoke)',
                boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
              }}
            >
              <LayoutGrid size={13} /> Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              aria-label="List view"
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px',
                borderRadius: 999, border: 0, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: viewMode === 'list' ? 'var(--paper)' : 'transparent',
                color: viewMode === 'list' ? 'var(--ink)' : 'var(--smoke)',
                boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
              }}
            >
              <List size={13} /> List
            </button>
          </div>
        </div>
      )}

      {designs.length === 0 ? (
        <div style={{ marginTop: 56, textAlign: 'center', padding: '40px 16px', background: 'var(--paper)', borderRadius: 24, border: '1px solid var(--line)' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'var(--ink)' }}>
            No saved designs yet
          </p>
          <p style={{ fontSize: 14, color: 'var(--smoke)', marginTop: 8, maxWidth: 420, margin: '8px auto 0' }}>
            Jump into the custom studio to create your own tees with stickers, custom photos and typography.
          </p>
          <Link
            to="/customize"
            style={{
              display: 'inline-block', marginTop: 22, padding: '12px 26px',
              background: 'var(--rust)', color: '#fff', borderRadius: 999,
              fontWeight: 700, fontSize: 14, boxShadow: '0 2px 8px rgba(200,84,47,.25)'
            }}
          >
            Start designing your tee
          </Link>
        </div>
      ) : filteredDesigns.length === 0 ? (
        <div style={{ marginTop: 40, textAlign: 'center', color: 'var(--smoke)' }}>
          <p>No designs match "{searchQuery}"</p>
        </div>
      ) : viewMode === 'list' ? (
        /* ── Canva-style List by List View ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }}>
          {filteredDesigns.map(d => {
            const fit = getFit(d.fit)
            const color = getTeeColor(d.colorId)
            const price = calcCustomUnitPrice(d.fit, d.placements.map(p => p.scale))
            const isAdded = added === d.id
            const dateStr = new Date(d.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

            return (
              <div
                key={d.id}
                style={{
                  background: 'var(--paper)', border: '1px solid var(--line)',
                  borderRadius: 18, padding: '12px 16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: 16, flexWrap: 'wrap', transition: 'box-shadow 0.15s ease'
                }}
              >
                {/* Visual Thumbnail */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 220, flex: '1 1 260px' }}>
                  <div
                    onClick={() => navigate(`/customize?design=${d.id}`)}
                    style={{
                      width: 72, height: 72, borderRadius: 14, background: 'var(--shell)',
                      padding: 4, cursor: 'pointer', flexShrink: 0, overflow: 'hidden',
                      display: 'grid', placeItems: 'center', border: '1px solid var(--line)'
                    }}
                    title="Click to edit in studio"
                  >
                    <div style={{ width: 64, height: 64, pointerEvents: 'none' }}>
                      <Tee3DPreview
                        colorHex={getTeeColor(d.colorId).hex}
                        placements={d.placements}
                        height={64}
                        minimal
                      />
                    </div>
                  </div>

                  <div>
                    <h3
                      onClick={() => navigate(`/customize?design=${d.id}`)}
                      style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, cursor: 'pointer', color: 'var(--ink)' }}
                    >
                      {d.name}
                    </h3>
                    <p style={{ color: 'var(--smoke)', fontSize: 12, marginTop: 3 }}>
                      {lang === 'ta' ? fit.nameTa : fit.nameEn} · Size {d.size} · {lang === 'ta' ? color.nameTa : color.nameEn}
                    </p>
                    <p style={{ color: 'var(--smoke)', fontSize: 11, marginTop: 2 }}>
                      Created {dateStr} · {d.placements.length} {d.placements.length === 1 ? 'print' : 'prints'}
                    </p>
                  </div>
                </div>

                {/* Print Breakdown Chips */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  {d.placements.slice(0, 3).map((p, i) => {
                    const info = getCategoryFromScale(p.scale)
                    return (
                      <span key={i} style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: 'var(--shell)', border: '1px solid var(--line)', color: 'var(--smoke)' }}>
                        {info.labelShort} (+{formatINR(info.price)})
                      </span>
                    )
                  })}
                  {d.placements.length > 3 && (
                    <span style={{ fontSize: 10, color: 'var(--smoke)' }}>+{d.placements.length - 3} more</span>
                  )}
                </div>

                {/* Price */}
                <div style={{ minWidth: 90, textAlign: 'right' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: 'var(--ink)' }}>
                    {formatINR(price)}
                  </span>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={() => handleBuyNow(d)}
                    title="Buy now directly"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '9px 16px', borderRadius: 999,
                      background: 'var(--rust)', color: '#fff', border: 0,
                      fontWeight: 700, fontSize: 12.5, cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(200,84,47,.2)'
                    }}
                  >
                    <Zap size={13} /> Buy now
                  </button>

                  <button
                    onClick={() => navigate(`/customize?design=${d.id}`)}
                    title="Edit in studio"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '9px 14px', borderRadius: 999,
                      border: '1px solid var(--line)', background: 'var(--paper)',
                      fontWeight: 600, fontSize: 12.5, cursor: 'pointer'
                    }}
                  >
                    <Pencil size={13} /> Edit
                  </button>

                  <button
                    onClick={() => handleAddToBag(d)}
                    title="Add to bag"
                    style={{
                      width: 36, height: 36, borderRadius: '50%',
                      border: '1px solid var(--line)', background: isAdded ? 'var(--ink)' : 'var(--paper)',
                      color: isAdded ? '#fff' : 'var(--ink)',
                      display: 'grid', placeItems: 'center', cursor: 'pointer'
                    }}
                  >
                    <ShoppingBag size={14} />
                  </button>

                  <button
                    onClick={() => handleDelete(d.id)}
                    title="Delete design"
                    style={{
                      width: 36, height: 36, borderRadius: '50%',
                      border: '1px solid var(--line)', background: 'var(--paper)',
                      color: 'var(--smoke)', display: 'grid', placeItems: 'center', cursor: 'pointer'
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* ── Canva-style Grid View ── */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 18, marginTop: 18 }}>
          {filteredDesigns.map(d => {
            const fit = getFit(d.fit)
            const color = getTeeColor(d.colorId)
            const price = calcCustomUnitPrice(d.fit, d.placements.map(p => p.scale))
            const isAdded = added === d.id

            return (
              <div
                key={d.id}
                style={{
                  background: 'var(--paper)', border: '1px solid var(--line)',
                  borderRadius: 22, padding: 14, display: 'flex', flexDirection: 'column',
                  position: 'relative', transition: 'box-shadow 0.15s ease'
                }}
              >
                {/* Visual Preview */}
                <div
                  onClick={() => navigate(`/customize?design=${d.id}`)}
                  style={{
                    background: 'var(--shell)', borderRadius: 16, padding: 10,
                    cursor: 'pointer', position: 'relative', overflow: 'hidden'
                  }}
                  title="Click to edit in studio"
                >
                  <div style={{ maxWidth: 210, margin: '0 auto', pointerEvents: 'none' }}>
                    <Tee3DPreview
                      colorHex={getTeeColor(d.colorId).hex}
                      placements={d.placements}
                      height={200}
                      minimal
                    />
                  </div>

                  <span style={{
                    position: 'absolute', top: 8, right: 8,
                    fontSize: 10.5, fontWeight: 700, padding: '3px 8px', borderRadius: 999,
                    background: 'rgba(255,255,255,0.9)', color: 'var(--ink)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
                  }}>
                    {d.size} · {d.placements.length} {d.placements.length === 1 ? 'print' : 'prints'}
                  </span>
                </div>

                {/* Details */}
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                    <h3
                      onClick={() => navigate(`/customize?design=${d.id}`)}
                      style={{ fontWeight: 700, fontSize: 15, cursor: 'pointer', color: 'var(--ink)', lineHeight: 1.3 }}
                    >
                      {d.name}
                    </h3>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: 'var(--ink)' }}>
                      {formatINR(price)}
                    </span>
                  </div>

                  <p style={{ color: 'var(--smoke)', fontSize: 12, marginTop: 4 }}>
                    {lang === 'ta' ? fit.nameTa : fit.nameEn} · {lang === 'ta' ? color.nameTa : color.nameEn}
                  </p>

                  {/* Print tags */}
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
                    {d.placements.slice(0, 2).map((p, i) => {
                      const pInfo = getCategoryFromScale(p.scale)
                      return (
                        <span key={i} style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 999, background: 'var(--shell)', color: 'var(--smoke)', border: '1px solid var(--line)' }}>
                          {pInfo.labelShort} (+{formatINR(pInfo.price)})
                        </span>
                      )
                    })}
                    {d.placements.length > 2 && (
                      <span style={{ fontSize: 10, color: 'var(--smoke)', alignSelf: 'center' }}>
                        +{d.placements.length - 2}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions: Buy Now & Edit */}
                <div style={{ marginTop: 'auto', paddingTop: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    <button
                      onClick={() => handleBuyNow(d)}
                      style={{
                        padding: '10px 8px', borderRadius: 999,
                        background: 'var(--rust)', color: '#fff', border: 0,
                        fontWeight: 700, fontSize: 12.5, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                        boxShadow: '0 2px 6px rgba(200,84,47,.2)'
                      }}
                    >
                      <Zap size={13} /> Buy now
                    </button>

                    <button
                      onClick={() => navigate(`/customize?design=${d.id}`)}
                      style={{
                        padding: '10px 8px', borderRadius: 999,
                        border: '1px solid var(--line)', background: 'var(--paper)',
                        fontWeight: 600, fontSize: 12.5, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4
                      }}
                    >
                      <Pencil size={12} /> Edit
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    <button
                      onClick={() => handleAddToBag(d)}
                      style={{
                        flex: 1, padding: '8px 10px', borderRadius: 999,
                        background: isAdded ? 'var(--ink)' : 'var(--shell)',
                        color: isAdded ? '#fff' : 'var(--ink)',
                        border: '1px solid var(--line)', fontWeight: 600, fontSize: 11.5,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4
                      }}
                    >
                      <ShoppingBag size={12} />
                      {isAdded ? 'Added to bag' : 'Add to bag'}
                    </button>

                    <button
                      onClick={() => handleDelete(d.id)}
                      title="Delete design"
                      style={{
                        width: 32, height: 32, borderRadius: '50%',
                        border: '1px solid var(--line)', background: 'var(--paper)',
                        display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--smoke)'
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
