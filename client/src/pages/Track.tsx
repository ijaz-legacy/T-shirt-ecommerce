import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Clock, Package, Truck, Check, AlertCircle } from 'lucide-react'
import { api, ApiError } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import type { Order } from '../lib/types'
import { formatINR } from '../lib/currency'

const STATUS_TEXT: Record<string, string> = {
  placed:     "We've received your COD order and reserved your tee.",
  processing: "Your custom tee is being printed and packed with care in our studio.",
  shipped:    "Your order has been handed to our courier partner and is on its way to you.",
  delivered:  "Delivered! We hope you love the fit and quality.",
  cancelled:  "This order was cancelled.",
}

const STEPS = [
  { key: 'placed', label: 'Order Placed', desc: 'Received & Confirmed', icon: CheckCircle2 },
  { key: 'processing', label: 'Printing & Packing', desc: 'Custom studio print', icon: Package },
  { key: 'shipped', label: 'Dispatched', desc: 'On the way', icon: Truck },
  { key: 'delivered', label: 'Delivered', desc: 'At your doorstep', icon: Check },
]

function getStepIndex(status: string): number {
  if (status === 'placed') return 0
  if (status === 'processing') return 1
  if (status === 'shipped') return 2
  if (status === 'delivered') return 3
  return -1 // cancelled or unknown
}

type TrackedOrder = Pick<Order, 'id' | 'order_number' | 'status' | 'created_at' | 'total'>

function toNumber(v: unknown): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = Date.parse(v)
    return Number.isNaN(n) ? 0 : n
  }
  return 0
}

export default function Track() {
  const { user } = useAuth()
  const [params] = useSearchParams()
  const initialOrder = params.get('order') || ''
  const [number, setNumber] = useState(initialOrder)
  const [order, setOrder] = useState<TrackedOrder | null | 'not-found' | 'unavailable'>(null)
  const [loading, setLoading] = useState(false)

  async function searchOrder(num: string) {
    if (!num.trim()) return
    setLoading(true)
    try {
      const res = await api.get<{ order: TrackedOrder }>(
        `/orders/track/${encodeURIComponent(num.trim().toUpperCase())}`,
      )
      setOrder(res.order)
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0
      setOrder(status === 404 || status === 400 ? 'not-found' : 'unavailable')
    }
    setLoading(false)
  }

  useEffect(() => {
    if (initialOrder) {
      searchOrder(initialOrder)
    }
  }, [initialOrder])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    searchOrder(number)
  }

  const currentStep = order && typeof order === 'object' ? getStepIndex(order.status) : -1
  const isCancelled = order && typeof order === 'object' && order.status === 'cancelled'

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 16px 60px' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 32, letterSpacing: '-0.025em' }}>
        Track your order
      </h1>
      <p style={{ color: 'var(--smoke)', marginTop: 8, fontSize: 14 }}>
        Enter your order number to see live printing and delivery progress.
      </p>

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, marginTop: 22, flexWrap: 'wrap' }}>
        <input
          value={number}
          onChange={e => { setNumber(e.target.value); setOrder(null) }}
          placeholder="e.g. IJZ-261030-4821"
          style={{
            flex: '1 1 220px', padding: '12px 16px',
            border: '1px solid var(--line)', borderRadius: 14,
            fontSize: 14.5, background: 'var(--paper)', color: 'var(--ink)',
          }}
        />
        <button type="submit" disabled={loading} style={{
          padding: '12px 26px', borderRadius: 999, fontWeight: 700, fontSize: 14,
          background: 'var(--ink)', color: 'var(--paper)', border: 0, cursor: 'pointer'
        }}>
          {loading ? 'Searching…' : 'Track order'}
        </button>
      </form>

      {order === 'not-found' && (
        <div style={{ marginTop: 24, padding: 22, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--rust)' }}>
            <AlertCircle size={18} />
            <p style={{ fontWeight: 700, fontSize: 15 }}>No order found</p>
          </div>
          <p style={{ color: 'var(--smoke)', fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>
            Please check the order number format (e.g. IJZ-261112-4821) on your SMS/WhatsApp confirmation and try again.
          </p>
        </div>
      )}

      {order === 'unavailable' && (
        <div style={{ marginTop: 24, padding: 22, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 20 }}>
          <p style={{ fontWeight: 700 }}>Tracking is temporarily unavailable</p>
          <p style={{ color: 'var(--smoke)', fontSize: 13, marginTop: 4 }}>
            Please try again in a moment, or reach out to us on WhatsApp.
          </p>
        </div>
      )}

      {order && order !== 'not-found' && order !== 'unavailable' && (
        <div style={{ marginTop: 24, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 24, padding: 24 }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20 }}>{order.order_number}</p>
              <p style={{ color: 'var(--smoke)', fontSize: 12.5, marginTop: 3 }}>
                Placed on {new Date(toNumber(order.created_at)).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <span style={{
              padding: '5px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.07em',
              background: isCancelled ? '#fbeae6' : order.status === 'delivered' ? '#e9f3e6' : 'var(--shell)',
              color: isCancelled ? 'var(--rust)' : order.status === 'delivered' ? '#15803d' : 'var(--ink)',
              border: '1px solid var(--line)',
            }}>
              {order.status}
            </span>
          </div>

          {/* Visual 4-Step Progress Bar */}
          {!isCancelled && (
            <div style={{ marginTop: 28, marginBottom: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', position: 'relative', gap: 8 }}>
                {STEPS.map((step, idx) => {
                  const isDone = idx < currentStep
                  const isCurrent = idx === currentStep
                  const Icon = step.icon

                  return (
                    <div key={step.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative', zIndex: 2 }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: '50%',
                        background: isDone ? 'var(--ink)' : isCurrent ? 'var(--rust)' : 'var(--shell)',
                        color: isDone || isCurrent ? '#fff' : 'var(--smoke)',
                        border: `2px solid ${isDone ? 'var(--ink)' : isCurrent ? 'var(--rust)' : 'var(--line)'}`,
                        display: 'grid', placeItems: 'center', transition: 'all 0.2s ease',
                        boxShadow: isCurrent ? '0 0 0 4px rgba(200,84,47,0.18)' : 'none',
                      }}>
                        <Icon size={16} />
                      </div>
                      <p style={{ fontSize: 12, fontWeight: isCurrent ? 800 : 600, marginTop: 8, color: isCurrent ? 'var(--ink)' : isDone ? 'var(--ink)' : 'var(--smoke)' }}>
                        {step.label}
                      </p>
                      <p style={{ fontSize: 10.5, color: 'var(--smoke)', marginTop: 2 }}>
                        {step.desc}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div style={{ padding: '14px 18px', background: 'var(--shell)', borderRadius: 16, marginTop: 14 }}>
            <p style={{ fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.6, fontWeight: 500 }}>
              {STATUS_TEXT[order.status] ?? ''}
            </p>
          </div>

          <div style={{ marginTop: 16, borderTop: '1px solid var(--line)', paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14 }}>
            <span style={{ color: 'var(--smoke)' }}>Cash due on delivery (COD)</span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18 }}>{formatINR(order.total)}</span>
          </div>

          {user ? (
            <Link to={`/orders/${order.id}`} style={{
              display: 'inline-block', marginTop: 14,
              fontSize: 13, fontWeight: 600, color: 'var(--rust)', textDecoration: 'underline',
            }}>
              View full receipt & items →
            </Link>
          ) : (
            <Link to={`/login?next=/orders/${order.id}`} style={{
              display: 'inline-block', marginTop: 14,
              fontSize: 13, fontWeight: 600, color: 'var(--rust)', textDecoration: 'underline',
            }}>
              Sign in to see full receipt & items →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
