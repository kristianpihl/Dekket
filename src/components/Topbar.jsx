import { Link } from 'react-router-dom'
import { site } from '../content/site'

export default function Topbar() {
  return (
    <header className="topbar">
      <Link to="/" className="topbar-brand">
        {site.name}
      </Link>
      <nav className="topbar-nav">
        {site.navLinks.map((link) => (
          <Link key={link.to} to={link.to}>
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  )
}
