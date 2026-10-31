import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div style={{ maxWidth: 480, margin: '80px auto', padding: '0 16px', textAlign: 'center' }}>
      <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--smoke)' }}>
        Lost the thread
      </p>
      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 36, letterSpacing: '-0.03em', marginTop: 8 }}>
        This page went missing.
      </h1>
      <p style={{ color: 'var(--smoke)', marginTop: 12 }}>
        The page you're looking for doesn't exist, or has moved.
      </p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 28 }}>
        <Link to="/" style={{ padding: '11px 22px', background: 'var(--ink)', color: 'var(--paper)', borderRadius: 999, fontWeight: 600 }}>
          Back to home
        </Link>
        <Link to="/shop" style={{ padding: '11px 22px', border: '1px solid var(--line)', background: 'var(--paper)', borderRadius: 999, fontWeight: 600 }}>
          Shop tees
        </Link>
      </div>
    </div>
  )
}
