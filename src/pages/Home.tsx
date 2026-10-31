import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Product } from '../lib/types'
import { useLang } from '../context/LangContext'
import { formatINR } from '../lib/currency'

export default function Home() {
  const { lang } = useLang()
  const [featured, setFeatured] = useState<Product[]>([])

  useEffect(() => {
    supabase
      .from('products')
      .select('*')
      .eq('active', true)
      .eq('featured', true)
      .order('sort_order')
      .limit(4)
      .then(({ data }) => { if (data) setFeatured(data) })
  }, [])

  return (
    <div>
      {/* Hero */}
      <section style={{ padding: '60px 16px 40px', maxWidth: 1180, margin: '0 auto' }}>
        <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--smoke)' }}>
          Small batch · Made in Tamil Nadu
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(36px,7vw,64px)', letterSpacing: '-0.035em', lineHeight: 1.03, marginTop: 10 }}>
          Tees that tell<br />
          <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: 400, color: 'var(--rust)' }}>your story.</span>
        </h1>
        <p style={{ color: 'var(--smoke)', fontSize: 15, lineHeight: 1.65, marginTop: 16, maxWidth: 520 }}>
          Soft, small-batch tees with prints you won't find everywhere — or design one in our custom studio. Cash on delivery across India.
        </p>
        <div style={{ display: 'flex', gap: 10, marginTop: 24, flexWrap: 'wrap' }}>
          <Link to="/shop" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'var(--ink)', color: 'var(--paper)',
            padding: '12px 22px', borderRadius: 999, fontWeight: 600, fontSize: 14,
          }}>
            Shop printed tees
          </Link>
          <Link to="/customize" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'var(--rust)', color: '#fff',
            padding: '12px 22px', borderRadius: 999, fontWeight: 600, fontSize: 14,
          }}>
            Design your own
          </Link>
        </div>
      </section>

      {/* Featured */}
      {featured.length > 0 && (
        <section style={{ padding: '0 16px 60px', maxWidth: 1180, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24, letterSpacing: '-0.02em' }}>
              This week's drop
            </h2>
            <Link to="/shop" style={{ fontSize: 13, fontWeight: 600, color: 'var(--smoke)', textDecoration: 'underline', textDecorationColor: 'var(--line)' }}>
              See all tees →
            </Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 16 }}>
            {featured.map(p => (
              <ProductCard key={p.slug} product={p} lang={lang} />
            ))}
          </div>
        </section>
      )}

      {/* Custom CTA */}
      <section style={{
        background: 'var(--ink)', color: 'var(--paper)',
        padding: '52px 16px', textAlign: 'center',
      }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(26px,5vw,42px)', letterSpacing: '-0.02em' }}>
          Make it completely yours.
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.65)', marginTop: 12, fontSize: 15, maxWidth: 480, margin: '12px auto 0' }}>
          Fit, colour, stickers, text — build a tee that's only yours. From ₹649. Cash on delivery.
        </p>
        <Link to="/customize" style={{
          display: 'inline-flex', marginTop: 24,
          background: 'var(--rust)', color: '#fff',
          padding: '13px 26px', borderRadius: 999, fontWeight: 700, fontSize: 14,
        }}>
          Open the custom studio →
        </Link>
      </section>
    </div>
  )
}

function ProductCard({ product, lang }: { product: Product; lang: string }) {
  const name = lang === 'ta' ? product.name_ta : product.name_en
  return (
    <Link to={`/product/${product.slug}`} style={{
      display: 'flex', flexDirection: 'column',
      background: 'var(--paper)', border: '1px solid var(--line)',
      borderRadius: 16, overflow: 'hidden',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 18px 46px -32px rgba(23,21,18,.45)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '' }}
    >
      <div style={{ aspectRatio: '4/5', background: '#efe6d6', overflow: 'hidden', position: 'relative' }}>
        <img src={product.image} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
        {product.badge && (
          <span style={{
            position: 'absolute', top: 10, left: 10,
            background: 'var(--ink)', color: 'var(--paper)',
            fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
            padding: '4px 9px', borderRadius: 999,
          }}>
            {product.badge}
          </span>
        )}
      </div>
      <div style={{ padding: '12px 14px 16px' }}>
        <h3 style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: '-0.01em' }}>{name}</h3>
        <p style={{ fontWeight: 700, marginTop: 4, fontSize: 14.5 }}>{formatINR(product.price)}</p>
      </div>
    </Link>
  )
}
