import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Order } from '../lib/types'
import { formatINR } from '../lib/currency'

const STATUS_TEXT: Record<string, string> = {
  placed:     "We've received your COD order and reserved your tee.",
  processing: "Your tee is being printed and packed in our studio.",
  shipped:    "Your order has left the studio and is on its way.",
  delivered:  "Delivered. We hope it fits just right.",
  cancelled:  "This order was cancelled.",
}

export default function Track() {
  const [number, setNumber] = useState('')
  const [order, setOrder] = useState<Order | null | 'not-found'>(null)
  const [loading, setLoading] = useState(false)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!number.trim()) return
    setLoading(true)
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('order_number', number.trim().toUpperCase())
      .single()
    setOrder(data ?? 'not-found')
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 16px 60px' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 32, letterSpacing: '-0.025em' }}>
        Track your order
      </h1>
      <p style={{ color: 'var(--smoke)', marginTop: 8, fontSize: 14 }}>
        Enter your order number to see the latest status.
      </p>

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, marginTop: 22, flexWrap: 'wrap' }}>
        <input
          value={number}
          onChange={e => { setNumber(e.target.value); setOrder(null) }}
          placeholder="e.g. IJZ-261030-4821"
          style={{
            flex: '1 1 220px', padding: '11px 14px',
            border: '1px solid var(--line)', borderRadius: 12,
            fontSize: 14.5, background: 'var(--paper)', color: 'var(--ink)',
          }}
        />
        <button type="submit" disabled={loading} style={{
          padding: '11px 22px', borderRadius: 999, fontWeight: 700, fontSize: 14,
          background: 'var(--ink)', color: 'var(--paper)', border: 0,
        }}>
          {loading ? 'Searching…' : 'Track order'}
        </button>
      </form>

      {order === 'not-found' && (
        <div style={{ marginTop: 24, padding: 20, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 20 }}>
          <p style={{ fontWeight: 700 }}>No order found</p>
          <p style={{ color: 'var(--smoke)', fontSize: 13, marginTop: 4 }}>
            Check the number on your order confirmation and try again.
          </p>
        </div>
      )}

      {order && order !== 'not-found' && (
        <div style={{ marginTop: 24, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 24, padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18 }}>{order.order_number}</p>
              <p style={{ color: 'var(--smoke)', fontSize: 12.5, marginTop: 3 }}>
                {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <span style={{
              padding: '5px 13px', borderRadius: 999, fontSize: 11, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.07em',
              background: 'var(--shell)', border: '1px solid var(--line)',
            }}>
              {order.status}
            </span>
          </div>

          <p style={{ marginTop: 14, fontSize: 14, color: 'var(--smoke)', lineHeight: 1.6 }}>
            {STATUS_TEXT[order.status] ?? ''}
          </p>

          <div style={{ marginTop: 14, borderTop: '1px solid var(--line)', paddingTop: 14, display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
            <span style={{ color: 'var(--smoke)' }}>Cash due on delivery</span>
            <span style={{ fontWeight: 700 }}>{formatINR(order.total)}</span>
          </div>

          <Link to={`/orders/${order.id}`} style={{
            display: 'inline-block', marginTop: 14,
            fontSize: 13, fontWeight: 600, color: 'var(--rust)', textDecoration: 'underline',
          }}>
            Full order details →
          </Link>
        </div>
      )}
    </div>
  )
}
