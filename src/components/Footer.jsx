import { site } from '../content/site'

export default function Footer() {
  return (
    <footer className="footer">
      <p>
        &copy; {new Date().getFullYear()} {site.name}
      </p>
      <p>Dekket gir informasjon og oversikt, ikke forsikringsrådgivning.</p>
    </footer>
  )
}
