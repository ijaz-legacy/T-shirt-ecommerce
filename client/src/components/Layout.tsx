import { useEffect, useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { ShoppingBag, Globe, Menu, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useStaffAccess } from '../lib/useStaffAccess'
import { useCart } from '../context/CartContext'
import { useLang } from '../context/LangContext'

export default function Layout() {
  const { user, signOut } = useAuth()
  const { isStaff } = useStaffAccess()
  const { count } = useCart()
  const { lang, toggle } = useLang()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  // A tap on any destination should leave the menu closed behind it.
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  const links = [
    { to: '/shop', label: 'Shop' },
    { to: '/customize', label: 'Custom tee' },
    { to: '/track', label: 'Track order' },
    ...(user ? [
      { to: '/designs', label: 'My designs' },
      { to: '/orders', label: 'Orders' },
    ] : []),
  ]

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(247,242,233,0.92)', backdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--line)',
      }}>
        <div className="site-head" style={{ maxWidth: 1180, margin: '0 auto', padding: '12px 16px' }}>
          <Link to="/" style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em' }}>
            IJAZ LEGACY
          </Link>

          <button
            type="button"
            className="site-menu-btn"
            onClick={() => setMenuOpen(open => !open)}
            aria-expanded={menuOpen}
            aria-controls="site-nav"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          <nav id="site-nav" className={menuOpen ? 'site-nav open' : 'site-nav'}>
            {links.map(link => (
              <Link key={link.to} to={link.to} style={{ color: 'inherit' }}>{link.label}</Link>
            ))}
            {isStaff && (
              <Link
                to="/admin"
                style={{
                  color: 'var(--rust)', fontWeight: 700,
                  border: '1px solid var(--line)', borderRadius: 999,
                  padding: '2px 10px', background: 'var(--paper)',
                }}
              >
                Admin
              </Link>
            )}
            {user ? (
              <button type="button" className="site-nav-signout" onClick={handleSignOut}>Sign out</button>
            ) : (
              <Link to="/login" className="site-nav-signout">Sign in</Link>
            )}
          </nav>

          <div className="site-actions">
            {/* Language toggle */}
            <button
              onClick={toggle}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'var(--paper)', border: '1px solid var(--line)',
                borderRadius: 999, padding: '5px 11px', fontSize: 12, fontWeight: 600,
              }}
            >
              <Globe size={13} />
              {lang === 'en' ? 'தமிழ்' : 'English'}
            </button>

            {/* Cart */}
            <Link to="/cart" style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }} aria-label={`Cart${count ? `, ${count} item${count > 1 ? 's' : ''}` : ', empty'}`}>
              <ShoppingBag size={18} />
              {count > 0 && (
                <span style={{
                  background: 'var(--rust)', color: '#fff',
                  borderRadius: 999, minWidth: 19, height: 19,
                  padding: '0 5px', fontSize: 11, fontWeight: 700,
                  display: 'inline-grid', placeItems: 'center',
                }}>
                  {count}
                </span>
              )}
            </Link>

            {/* Auth (desktop; phones use the menu entry) */}
            {user ? (
              <button
                onClick={handleSignOut}
                className="site-signout"
                style={{ background: 'none', border: 0, fontWeight: 600, fontSize: 13, color: 'var(--smoke)', textDecoration: 'underline', textDecorationColor: 'var(--line)' }}
              >
                Sign out
              </button>
            ) : (
              <Link to="/login" className="site-signout" style={{ fontWeight: 600, fontSize: 13 }}>Sign in</Link>
            )}
          </div>
        </div>
      </header>

      {/* Page content */}
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--line)', padding: '28px 16px' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, fontSize: 12.5 }}>
          <div>
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14 }}>IJAZ LEGACY</p>
            <p style={{ color: 'var(--smoke)', marginTop: 4 }}>Small batch · Made in Tamil Nadu</p>
          </div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', color: 'var(--smoke)', alignItems: 'center' }}>
            <Link to="/shop">Shop</Link>
            <Link to="/customize">Custom studio</Link>
            <Link to="/track">Track order</Link>
            <a href="https://wa.me/918754750458" target="_blank" rel="noopener">WhatsApp</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
