import { Link } from 'react-router-dom'
import { site } from '../content/site'
import { useAuth } from './AuthProvider'

export default function Topbar() {
  const { user, loading, signOut } = useAuth()

  return (
    <header className="topbar">
      <Link to="/" className="topbar-brand">
        {site.name}
      </Link>
      <nav className="topbar-nav">
        {user &&
          site.navLinks.map((link) => (
            <Link key={link.to} to={link.to}>
              {link.label}
            </Link>
          ))}
        {user ? (
          <button type="button" className="link-button" onClick={() => signOut()}>
            Logg ut
          </button>
        ) : (
          !loading && <Link to="/login">Logg inn</Link>
        )}
      </nav>
    </header>
  )
}
