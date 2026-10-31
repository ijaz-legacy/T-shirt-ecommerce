import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import type { Order } from '../lib/types'
import { formatINR } from '../lib/currency'

const STATUS_COLORS: Record<string, string> = {
  placed:     '#fff6de',
  processing: '#e9eefb',
  shipped:    '#e6f2f6',
  delivered:  '#e9f3e6',
  cancelled:  '#fbeae6',
}

export default function Orders() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) { navigate('/login?next=/orders'); return }
    supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setOrders(data); setLoading(false) })
  }, [user, authLoading, navigate])

  if (loading || authLoading) return <p style={{ padding: 40, color: 'var(--smoke)' }}>Loading…</p>

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 16px 60px' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 32, letterSpacing: '-0.025em' }}>
        Your orders
      </h1>

      {orders.length === 0 ? (
        <div style={{ marginTop: 40, textAlign: 'center' }}>
          <p style={{ color: 'var(--smoke)', fontSize: 15 }}>No orders yet. Your first tee is waiting.</p>
          <Link to="/shop" style={{ display: 'inline-block', marginTop: 16, padding: '11px 22px', background: 'var(--ink)', color: 'var(--paper)', borderRadius: 999, fontWeight: 600 }}>
            Start shopping
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
          {orders.map(order => (
            <div key={order.id} style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 20, padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16 }}>
                  {order.order_number}
                </p>
                <p style={{ color: 'var(--smoke)', fontSize: 12.5, marginTop: 3 }}>
                  {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span style={{
                  padding: '5px 13px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.07em',
                  background: STATUS_COLORS[order.status] || '#f0f0f0',
                  border: '1px solid var(--line)',
                }}>
                  {order.status}
                </span>
                <span style={{ fontWeight: 700 }}>{formatINR(order.total)}</span>
                <Link to={`/orders/${order.id}`} style={{ fontSize: 13, fontWeight: 600, color: 'var(--rust)', textDecoration: 'underline' }}>
                  View →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
