import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next') || '/orders'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const err = await signIn(email, password)
    if (err) { setError(err); setLoading(false) }
    else navigate(next)
  }

  return (
    <div style={{ maxWidth: 420, margin: '60px auto', padding: '0 16px' }}>
      <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 28, padding: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, letterSpacing: '-0.025em' }}>Sign in</h1>
        <p style={{ color: 'var(--smoke)', marginTop: 6, fontSize: 14 }}>Your tees, orders and addresses in one place.</p>

        <form onSubmit={handleSubmit} style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Email" type="email" value={email} onChange={setEmail} />
          <Field label="Password" type="password" value={password} onChange={setPassword} />
          {error && <p style={{ color: 'var(--rust)', fontSize: 12.5 }}>{error}</p>}
          <button type="submit" disabled={loading} style={{
            padding: '12px', borderRadius: 999, fontWeight: 700, fontSize: 14,
            background: 'var(--ink)', color: 'var(--paper)', border: 0,
          }}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p style={{ marginTop: 16, fontSize: 13, color: 'var(--smoke)', textAlign: 'center' }}>
          New here? <Link to="/register" style={{ color: 'var(--rust)', fontWeight: 600 }}>Create an account</Link>
        </p>
      </div>
    </div>
  )
}

function Field({ label, type, value, onChange }: { label: string; type: string; value: string; onChange: (v: string) => void }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--smoke)' }}>{label}</span>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} required style={{
        padding: '10px 13px', border: '1px solid var(--line)', borderRadius: 12, fontSize: 14.5,
        background: 'var(--paper)', color: 'var(--ink)',
      }} />
    </label>
  )
}
