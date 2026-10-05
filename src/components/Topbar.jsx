import { Link } from 'react-router-dom'
import { site } from '../content/site'
import { useAuth } from './AuthProvider'

// Top bar for the public pages (front page, login). Inside the app the sidebar is used instead.
export default function Topbar() {
  const { user, loading, signOut } = useAuth()

  return (
    <header className="topbar">
      <Link to="/" className="topbar-brand">
        {site.name}
      </Link>
      <nav className="topbar-nav">
        <Link to="/#slik-fungerer-det" className="topbar-anchor">
          Slik fungerer det
        </Link>
        <Link to="/#pris" className="topbar-anchor">
          Pris
        </Link>
        {user ? (
          <>
            <Link to="/dashboard">Åpne appen</Link>
            <button type="button" className="link-button" onClick={() => signOut()}>
              Logg ut
            </button>
          </>
        ) : (
          !loading && (
            <>
              <Link to="/login">Logg inn</Link>
              <Link to="/login?ny=1" className="cta cta--small">
                Kom i gang
              </Link>
            </>
          )
        )}
      </nav>
    </header>
  )
}
