import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    setLoading(true)
    setError(null)
    const err = await signUp(name, email, password)
    if (err) { setError(err); setLoading(false) }
    else navigate('/orders')
  }

  return (
    <div style={{ maxWidth: 420, margin: '60px auto', padding: '0 16px' }}>
      <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 28, padding: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, letterSpacing: '-0.025em' }}>
          Create account
        </h1>
        <p style={{ color: 'var(--smoke)', marginTop: 6, fontSize: 14 }}>
          One account for prints, customs and COD orders.
        </p>
        <form onSubmit={handleSubmit} style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { label: 'Full name',  type: 'text',     value: name,     set: setName },
            { label: 'Email',      type: 'email',    value: email,    set: setEmail },
            { label: 'Password',   type: 'password', value: password, set: setPassword },
          ].map(f => (
            <label key={f.label} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--smoke)' }}>
                {f.label}
              </span>
              <input
                type={f.type}
                value={f.value}
                onChange={e => f.set(e.target.value)}
                required
                style={{ padding: '10px 13px', border: '1px solid var(--line)', borderRadius: 12, fontSize: 14.5, background: 'var(--paper)', color: 'var(--ink)' }}
              />
            </label>
          ))}
          {error && <p style={{ color: 'var(--rust)', fontSize: 12.5 }}>{error}</p>}
          <button type="submit" disabled={loading} style={{ padding: '12px', borderRadius: 999, fontWeight: 700, fontSize: 14, background: 'var(--ink)', color: 'var(--paper)', border: 0 }}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <p style={{ marginTop: 16, fontSize: 13, color: 'var(--smoke)', textAlign: 'center' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--rust)', fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
