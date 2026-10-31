import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { calcShipping } from '../lib/catalog'
import { formatINR } from '../lib/currency'

interface Addr {
  name: string; phone: string; address1: string; address2: string
  city: string; state: string; pincode: string
}

const EMPTY: Addr = { name: '', phone: '', address1: '', address2: '', city: '', state: 'Tamil Nadu', pincode: '' }

function uid() { return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) }
function orderNum() { return 'IJZ-' + new Date().toISOString().slice(2, 10).replace(/-/g, '') + '-' + Math.floor(Math.random() * 9000 + 1000) }

export default function Checkout() {
  const { items, subtotal, clear } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [addr, setAddr] = useState<Addr>({ ...EMPTY, name: user?.user_metadata?.name || '' })
  const [errors, setErrors] = useState<Partial<Addr>>({})
  const [placing, setPlacing] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const shipping = calcShipping(subtotal)
  const total = subtotal + shipping

  if (!user) return (
    <div style={{ maxWidth: 480, margin: '60px auto', padding: '0 16px', textAlign: 'center' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28 }}>Sign in to checkout</h1>
      <Link to="/login?next=/checkout" style={{ display: 'inline-block', marginTop: 16, padding: '11px 22px', background: 'var(--ink)', color: 'var(--paper)', borderRadius: 999, fontWeight: 600 }}>Sign in</Link>
    </div>
  )

  if (items.length === 0) {
    navigate('/cart')
    return null
  }

  function validate(): boolean {
    const e: Partial<Addr> = {}
    if (addr.name.trim().length < 2) e.name = 'Required'
    if (!/^[0-9+\-\s]{10,15}$/.test(addr.phone)) e.phone = 'Enter a valid phone number'
    if (addr.address1.trim().length < 5) e.address1 = 'Required'
    if (!addr.city.trim()) e.city = 'Required'
    if (!addr.state.trim()) e.state = 'Required'
    if (!/^[0-9]{6}$/.test(addr.pincode)) e.pincode = 'Enter a 6-digit PIN code'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handlePlaceOrder() {
    if (!validate()) return
    setPlacing(true)
    setServerError(null)

    const orderId = uid()
    const orderNumber = orderNum()
    const now = Date.now()

    try {
      const { error: orderError } = await supabase.from('orders').insert({
        id: orderId,
        order_number: orderNumber,
        user_id: user!.id,
        status: 'placed',
        customer_name: addr.name.trim(),
        phone: addr.phone.trim(),
        address1: addr.address1.trim(),
        address2: addr.address2.trim(),
        city: addr.city.trim(),
        state: addr.state.trim(),
        pincode: addr.pincode.trim(),
        subtotal,
        shipping_fee: shipping,
        total,
        payment_method: 'cod',
        created_at: now,
      })
      if (orderError) throw orderError

      const orderItems = items.map(item => ({
        id: uid(),
        order_id: orderId,
        kind: item.kind,
        product_slug: item.slug || null,
        name_en: item.nameEn,
        name_ta: item.nameTa,
        size: item.size,
        color_en: item.colorEn,
        color_ta: item.colorTa,
        image: item.image || null,
        custom_config: item.placements ? JSON.stringify(item.placements) : null,
        quantity: item.qty,
        unit_price: item.unitPrice,
      }))
      const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
      if (itemsError) throw itemsError

      await supabase.from('order_status_events').insert({ id: uid(), order_id: orderId, status: 'placed', note: null, created_at: now })

      clear()
      navigate(`/orders/${orderId}?placed=1`)
    } catch (err: unknown) {
      setServerError('Could not place the order. Please try again.')
      console.error(err)
      setPlacing(false)
    }
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 16px 60px' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 32, letterSpacing: '-0.025em' }}>Checkout</h1>
      <p style={{ color: 'var(--smoke)', marginTop: 6 }}>Pay cash when your tee arrives. No online payment needed.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 24, marginTop: 28 }}>
        {/* Address form */}
        <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 24, padding: 22 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, marginBottom: 16 }}>Delivery details</h2>

          {([
            { key: 'name', label: 'Full name', type: 'text' },
            { key: 'phone', label: 'Phone number', type: 'tel' },
            { key: 'address1', label: 'Address line 1', type: 'text' },
            { key: 'address2', label: 'Address line 2 (optional)', type: 'text' },
            { key: 'city', label: 'City', type: 'text' },
            { key: 'state', label: 'State', type: 'text' },
            { key: 'pincode', label: 'PIN code', type: 'text' },
          ] as { key: keyof Addr; label: string; type: string }[]).map(({ key, label, type }) => (
            <div key={key} style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--smoke)', marginBottom: 5 }}>
                {label}
              </label>
              <input
                type={type}
                value={addr[key]}
                onChange={e => setAddr(a => ({ ...a, [key]: e.target.value }))}
                style={{
                  width: '100%', padding: '10px 13px',
                  border: `1px solid ${errors[key] ? 'var(--rust)' : 'var(--line)'}`,
                  borderRadius: 12, fontSize: 14.5,
                  background: 'var(--paper)', color: 'var(--ink)',
                }}
              />
              {errors[key] && <p style={{ color: 'var(--rust)', fontSize: 12, marginTop: 3 }}>{errors[key]}</p>}
            </div>
          ))}
        </div>

        {/* Summary */}
        <div>
          <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 24, padding: 22 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, marginBottom: 14 }}>Order summary</h2>
            {items.map(item => (
              <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8, color: 'var(--smoke)' }}>
                <span>{item.nameEn} · {item.size} × {item.qty}</span>
                <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{formatINR(item.unitPrice * item.qty)}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px solid var(--line)', marginTop: 12, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--smoke)' }}>
                <span>Delivery</span><span>{shipping === 0 ? 'Free' : formatINR(shipping)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16 }}>
                <span>Total</span><span>{formatINR(total)}</span>
              </div>
            </div>

            <div style={{ marginTop: 14, padding: 13, background: 'var(--shell)', borderRadius: 12 }}>
              <p style={{ fontWeight: 700, fontSize: 13 }}>💵 Cash on delivery</p>
              <p style={{ color: 'var(--smoke)', fontSize: 12.5, marginTop: 4 }}>Pay in cash when your tee arrives. No online payment needed.</p>
            </div>

            {serverError && <p style={{ color: 'var(--rust)', fontSize: 12.5, marginTop: 10 }}>{serverError}</p>}

            <button
              onClick={handlePlaceOrder}
              disabled={placing}
              style={{
                display: 'block', width: '100%', marginTop: 14,
                padding: '13px', borderRadius: 999, fontWeight: 700, fontSize: 14,
                background: placing ? 'var(--smoke)' : 'var(--ink)', color: 'var(--paper)', border: 0,
              }}
            >
              {placing ? 'Placing order…' : `Place order · ${formatINR(total)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
