import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Product } from '../lib/types'
import { useLang } from '../context/LangContext'
import { formatINR } from '../lib/currency'

const CATEGORIES = ['all', 'nature', 'retro', 'abstract', 'street']

export default function Shop() {
  const { lang } = useLang()
  const [searchParams, setSearchParams] = useSearchParams()
  const cat = searchParams.get('category') || 'all'
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    let query = supabase.from('products').select('*').eq('active', true).order('sort_order')
    if (cat !== 'all') query = query.eq('category', cat)
    query.then(({ data }) => {
      if (data) setProducts(data)
      setLoading(false)
    })
  }, [cat])

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '32px 16px 60px' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(28px,5vw,42px)', letterSpacing: '-0.03em' }}>
        The collection
      </h1>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '20px 0' }}>
        {CATEGORIES.map(c => (
          <button
            key={c}
            onClick={() => setSearchParams(c === 'all' ? {} : { category: c })}
            style={{
              border: '1px solid var(--line)', borderRadius: 999,
              padding: '7px 16px', fontSize: 12.5, fontWeight: 600,
              background: cat === c ? 'var(--ink)' : 'var(--paper)',
              color: cat === c ? 'var(--paper)' : 'var(--smoke)',
              cursor: 'pointer',
            }}
          >
            {c.charAt(0).toUpperCase() + c.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: 'var(--smoke)' }}>Loading…</p>
      ) : products.length === 0 ? (
        <p style={{ color: 'var(--smoke)' }}>No tees in this category yet.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: 16 }}>
          {products.map(p => {
            const name = lang === 'ta' ? p.name_ta : p.name_en
            return (
              <Link key={p.slug} to={`/product/${p.slug}`} style={{
                display: 'flex', flexDirection: 'column',
                background: 'var(--paper)', border: '1px solid var(--line)',
                borderRadius: 16, overflow: 'hidden',
              }}>
                <div style={{ aspectRatio: '4/5', background: '#efe6d6', overflow: 'hidden', position: 'relative' }}>
                  <img src={p.image} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                  {p.badge && (
                    <span style={{
                      position: 'absolute', top: 10, left: 10,
                      background: 'var(--ink)', color: 'var(--paper)',
                      fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase',
                      padding: '4px 9px', borderRadius: 999,
                    }}>{p.badge}</span>
                  )}
                  {p.stock === 0 && (
                    <span style={{
                      position: 'absolute', top: 10, right: 10,
                      background: 'var(--rust)', color: '#fff',
                      fontSize: 9.5, fontWeight: 700, padding: '4px 9px', borderRadius: 999,
                    }}>Sold out</span>
                  )}
                </div>
                <div style={{ padding: '12px 14px 16px' }}>
                  <h3 style={{ fontSize: 14.5, fontWeight: 700 }}>{name}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 14.5 }}>{formatINR(p.price)}</span>
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: p.color_hex, border: '1px solid var(--line)', flexShrink: 0 }} />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
