import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Product } from '../lib/types'
import { SIZES, type Size } from '../lib/catalog'
import { useLang } from '../context/LangContext'
import { useCart } from '../context/CartContext'
import { formatINR } from '../lib/currency'

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>()
  const { lang } = useLang()
  const { addPrinted } = useCart()
  const navigate = useNavigate()

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [size, setSize] = useState<Size | null>(null)
  const [qty, setQty] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    if (!slug) return
    supabase.from('products').select('*').eq('slug', slug).eq('active', true).single()
      .then(({ data }) => { setProduct(data); setLoading(false) })
  }, [slug])

  if (loading) return <div style={{ padding: 40, color: 'var(--smoke)' }}>Loading…</div>
  if (!product) return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <h1 style={{ fontFamily: 'var(--font-display)' }}>Tee not found</h1>
      <Link to="/shop" style={{ color: 'var(--rust)', fontWeight: 600 }}>Back to shop</Link>
    </div>
  )

  const name = lang === 'ta' ? product.name_ta : product.name_en
  const desc = lang === 'ta' ? product.desc_ta : product.desc_en
  const soldOut = product.stock === 0

  function handleAddToCart() {
    if (!size) { setError('Please choose a size first.'); return }
    addPrinted(product!, size, qty)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
    setError(null)
  }

  function handleBuyNow() {
    if (!size) { setError('Please choose a size first.'); return }
    addPrinted(product!, size, qty)
    navigate('/checkout')
  }

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '24px 16px 60px' }}>
      <p style={{ fontSize: 12.5, color: 'var(--smoke)', marginBottom: 20 }}>
        <Link to="/shop">Shop</Link> → {name}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 40, alignItems: 'start' }}>
        {/* Image */}
        <div style={{ borderRadius: 24, overflow: 'hidden', border: '1px solid var(--line)', background: '#efe6d6' }}>
          {product.image ? (
            <img src={product.image} alt={name} style={{ width: '100%' }} />
          ) : (
            <div style={{ aspectRatio: '4/5', display: 'grid', placeItems: 'center', color: 'var(--smoke)', fontSize: 13 }}>
              Photo coming soon
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(26px,4vw,36px)', letterSpacing: '-0.025em' }}>
            {name}
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
            <span style={{ fontWeight: 700, fontSize: 22 }}>{formatINR(product.price)}</span>
            <span style={{ width: 14, height: 14, borderRadius: '50%', background: product.color_hex, border: '1px solid var(--line)' }} />
            <span style={{ color: 'var(--smoke)', fontSize: 13 }}>{lang === 'ta' ? product.color_ta : product.color_en}</span>
          </div>

          <p style={{ color: 'var(--smoke)', marginTop: 14, lineHeight: 1.65, fontSize: 14.5 }}>{desc}</p>

          {soldOut ? (
            <div style={{ marginTop: 24, padding: '14px', background: '#fbeae6', borderRadius: 14, color: 'var(--rust-dark)', fontSize: 13 }}>
              This print is sold out. We're making more — check back soon.
            </div>
          ) : (
            <>
              {/* Size picker */}
              <div style={{ marginTop: 24 }}>
                <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--smoke)', marginBottom: 10 }}>
                  Choose a size
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {SIZES.map(s => (
                    <button
                      key={s}
                      onClick={() => { setSize(s); setError(null) }}
                      style={{
                        minWidth: 48, padding: '9px 14px',
                        border: '1px solid var(--line)', borderRadius: 12,
                        background: size === s ? 'var(--ink)' : 'var(--paper)',
                        color: size === s ? 'var(--paper)' : 'var(--ink)',
                        fontWeight: 600, fontSize: 13,
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Qty */}
              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--smoke)' }}>Qty</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--line)', background: 'var(--paper)', fontWeight: 700 }}>−</button>
                  <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 600 }}>{qty}</span>
                  <button onClick={() => setQty(q => Math.min(10, q + 1))} style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--line)', background: 'var(--paper)', fontWeight: 700 }}>+</button>
                </div>
              </div>

              {error && <p style={{ color: 'var(--rust)', fontSize: 12.5, marginTop: 8 }}>{error}</p>}

              {/* CTAs */}
              <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
                <button onClick={handleAddToCart} style={{
                  flex: 1, padding: '13px 20px', borderRadius: 999, fontWeight: 700, fontSize: 14,
                  background: added ? 'var(--moss)' : 'var(--ink)', color: 'var(--paper)', border: 0,
                }}>
                  {added ? '✓ Added to bag' : 'Add to bag'}
                </button>
                <button onClick={handleBuyNow} style={{
                  flex: 1, padding: '13px 20px', borderRadius: 999, fontWeight: 700, fontSize: 14,
                  background: 'var(--rust)', color: '#fff', border: 0,
                }}>
                  Buy now
                </button>
              </div>

              {/* COD note */}
              <p style={{ marginTop: 14, fontSize: 12.5, color: 'var(--smoke)' }}>
                💵 Cash on delivery · Made to order · Ships in 3–6 days
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
