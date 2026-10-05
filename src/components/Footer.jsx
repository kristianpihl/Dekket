import { Link } from 'react-router-dom'
import { site } from '../content/site'

export default function Footer() {
  return (
    <footer className="footer">
      <p>
        &copy; {new Date().getFullYear()} {site.name}
      </p>
      <p className="footer-links">
        <Link to="/vilkar">Vilkår</Link>
        <Link to="/personvern">Personvern</Link>
      </p>
      <p>Dekket gir informasjon og oversikt, ikke forsikringsrådgivning.</p>
    </footer>
  )
}
