import { useEffect, useState } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import type { Order, OrderItem } from '../lib/types'
import { formatINR } from '../lib/currency'

/** Postgres Cloud stores created_at as timestamptz; Date objects come back. */
function toNumber(v: unknown): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = Date.parse(v)
    return Number.isNaN(n) ? 0 : n
  }
  return 0
}

interface StatusEvent { id: string; status: string; note: string | null; created_at: number }
const STATUS_LABELS: Record<string, string> = {
  placed: 'Order placed', processing: 'Processing', shipped: 'Shipped',
  delivered: 'Delivered', cancelled: 'Cancelled',
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [queryParams] = useSearchParams()
  const justPlaced = queryParams.get('placed') === '1'

  const [order, setOrder] = useState<Order | null>(null)
  const [items, setItems] = useState<OrderItem[]>([])
  const [events, setEvents] = useState<StatusEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    Promise.all([
      supabase.from('orders').select('*').eq('id', id).single(),
      supabase.from('order_items').select('*').eq('order_id', id),
      supabase.from('order_status_events').select('*').eq('order_id', id).order('created_at'),
    ]).then(([{ data: o }, { data: oi }, { data: oe }]) => {
      if (o) {
        // Normalize timestamptz rows back to numbers for the timeline.
        setOrder({ ...o, created_at: toNumber(o.created_at) })
      }
      if (oi) setItems(oi)
      if (oe) setEvents(oe.map((e) => ({ ...e, created_at: toNumber(e.created_at) })))
      setLoading(false)
    })
  }, [id])

  if (loading) return <p style={{ padding: 40, color: 'var(--smoke)' }}>Loading…</p>
  if (!order) return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <p>Order not found.</p>
      <Link to="/orders">← Back to orders</Link>
    </div>
  )

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 16px 60px' }}>
      {justPlaced && (
        <div style={{ background: '#e9f3e6', border: '1px solid #b9d4b0', borderRadius: 16, padding: '14px 18px', marginBottom: 24 }}>
          <p style={{ fontWeight: 700 }}>✓ Order placed!</p>
          <p style={{ color: 'var(--smoke)', fontSize: 13, marginTop: 4 }}>
            Thank you! Your cash-on-delivery order is confirmed.
          </p>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26 }}>
          Order {order.order_number}
        </h1>
        <Link to="/orders" style={{ fontSize: 13, color: 'var(--smoke)', textDecoration: 'underline' }}>← All orders</Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 20 }}>
        {/* Items */}
        <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 20, padding: 20 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, marginBottom: 14 }}>Items</h2>
          {items.map(item => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--line)', fontSize: 13 }}>
              <div>
                <p style={{ fontWeight: 600 }}>{item.name_en}</p>
                <p style={{ color: 'var(--smoke)', marginTop: 2 }}>{item.size} · {item.color_en} × {item.quantity}</p>
              </div>
              <p style={{ fontWeight: 700 }}>{formatINR(item.unit_price * item.quantity)}</p>
            </div>
          ))}
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--smoke)' }}>
              <span>Delivery</span><span>{formatINR(order.shipping_fee)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 15 }}>
              <span>Total</span><span>{formatINR(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Delivery + Timeline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 20, padding: 20 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, marginBottom: 10 }}>Deliver to</h2>
            <address style={{ fontStyle: 'normal', color: 'var(--smoke)', fontSize: 13.5, lineHeight: 1.7 }}>
              {order.customer_name}<br />
              {order.phone}<br />
              {order.address1}{order.address2 ? ', ' + order.address2 : ''}<br />
              {order.city}, {order.state} – {order.pincode}
            </address>
          </div>

          <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 20, padding: 20 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, marginBottom: 14 }}>Order timeline</h2>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {events.map((ev, i) => (
                <li key={ev.id} style={{ display: 'flex', gap: 12, paddingBottom: 14, position: 'relative' }}>
                  {i < events.length - 1 && (
                    <span style={{ position: 'absolute', left: 5, top: 14, bottom: 0, width: 1, background: 'var(--line)' }} />
                  )}
                  <span style={{ width: 11, height: 11, borderRadius: '50%', background: 'var(--rust)', flexShrink: 0, marginTop: 4 }} />
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 13.5 }}>{STATUS_LABELS[ev.status] ?? ev.status}</p>
                    {ev.note && <p style={{ color: 'var(--smoke)', fontSize: 12.5, marginTop: 2 }}>{ev.note}</p>}
                    <p style={{ color: 'var(--smoke)', fontSize: 11.5, marginTop: 2 }}>
                      {new Date(ev.created_at).toLocaleString('en-IN')}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
