import { Link, useNavigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useLang } from '../context/LangContext'
import { formatINR } from '../lib/currency'
import { calcShipping } from '../lib/catalog'

export default function Cart() {
  const { items, remove, setQty, subtotal } = useCart()
  const { lang } = useLang()
  const navigate = useNavigate()
  const { shippingFee, total } = { shippingFee: calcShipping(subtotal), total: subtotal + calcShipping(subtotal) }

  if (items.length === 0) return (
    <div style={{ maxWidth: 640, margin: '60px auto', padding: '0 16px', textAlign: 'center' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 32 }}>Your bag is empty.</h1>
      <p style={{ color: 'var(--smoke)', marginTop: 10 }}>Add a print you love, or design your own.</p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 24 }}>
        <Link to="/shop" style={{ padding: '11px 20px', background: 'var(--ink)', color: 'var(--paper)', borderRadius: 999, fontWeight: 600 }}>Browse tees</Link>
        <Link to="/customize" style={{ padding: '11px 20px', background: 'var(--rust)', color: '#fff', borderRadius: 999, fontWeight: 600 }}>Custom studio</Link>
      </div>
    </div>
  )

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '32px 16px 60px' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 32, letterSpacing: '-0.025em' }}>Your bag</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24, marginTop: 24 }}>
        {/* Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map(item => {
            const name = lang === 'ta' ? item.nameTa : item.nameEn
            return (
              <div key={item.key} style={{
                display: 'grid', gridTemplateColumns: '72px 1fr auto',
                gap: 14, alignItems: 'center',
                background: 'var(--paper)', border: '1px solid var(--line)',
                borderRadius: 16, padding: 14,
              }}>
                <div style={{ width: 72, height: 86, borderRadius: 10, overflow: 'hidden', background: '#efe6d6', flexShrink: 0 }}>
                  {item.image && <img src={item.image} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                </div>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>{name}</p>
                  <p style={{ color: 'var(--smoke)', fontSize: 12.5, marginTop: 2 }}>
                    {item.size} · {lang === 'ta' ? item.colorTa : item.colorEn}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    <button onClick={() => setQty(item.key, item.qty - 1)} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--line)', background: 'var(--paper)', fontWeight: 700 }}>−</button>
                    <span style={{ fontSize: 13, fontWeight: 600, minWidth: 20, textAlign: 'center' }}>{item.qty}</span>
                    <button onClick={() => setQty(item.key, item.qty + 1)} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--line)', background: 'var(--paper)', fontWeight: 700 }}>+</button>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontWeight: 700 }}>{formatINR(item.unitPrice * item.qty)}</p>
                  <button onClick={() => remove(item.key)} style={{ marginTop: 8, background: 'none', border: 0, color: 'var(--smoke)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                    <Trash2 size={13} /> Remove
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Summary */}
        <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 24, padding: 20 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18 }}>Order summary</h2>
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13.5 }}>
            <Row label="Subtotal" value={formatINR(subtotal)} />
            <Row label="Delivery" value={shippingFee === 0 ? 'Free' : formatINR(shippingFee)} />
            {shippingFee > 0 && <p style={{ fontSize: 11.5, color: 'var(--smoke)' }}>Add {formatINR(999 - subtotal)} more for free delivery</p>}
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 10 }}>
              <Row label="Total" value={formatINR(total)} bold />
            </div>
          </div>
          <button onClick={() => navigate('/checkout')} style={{
            display: 'block', width: '100%', marginTop: 16,
            padding: '13px', borderRadius: 999, fontWeight: 700, fontSize: 14,
            background: 'var(--ink)', color: 'var(--paper)', border: 0,
          }}>
            Proceed to checkout
          </button>
          <p style={{ marginTop: 10, textAlign: 'center', fontSize: 12, color: 'var(--smoke)' }}>
            💵 Cash on delivery only
          </p>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontWeight: bold ? 700 : 400 }}>
      <span style={{ color: bold ? 'var(--ink)' : 'var(--smoke)' }}>{label}</span>
      <span>{value}</span>
    </div>
  )
}
