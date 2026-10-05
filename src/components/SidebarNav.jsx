import { Link, NavLink } from 'react-router-dom'
import { appNav, site } from '../content/site'
import { useAuth } from './AuthProvider'

// The left-hand menu. Used both as the fixed desktop sidebar and inside the
// slide-in drawer on mobile (then `onNavigate` closes the drawer after a click).
export default function SidebarNav({ onNavigate }) {
  const { user, signOut } = useAuth()

  return (
    <div className="sidebar-inner">
      <Link to="/dashboard" className="sidebar-brand" onClick={onNavigate}>
        {site.name}
      </Link>

      <nav className="sidebar-nav">
        {appNav.map((item) => (
          <NavLink key={item.to} to={item.to} className="sidebar-link" onClick={onNavigate}>
            <i className={`bi bi-${item.icon}`} aria-hidden="true" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-foot">
        <div className="sidebar-user">{user?.email}</div>
        <button type="button" className="link-button" onClick={() => signOut()}>
          Logg ut
        </button>
      </div>
    </div>
  )
}
