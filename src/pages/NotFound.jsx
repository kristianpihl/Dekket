import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <section>
      <h1>Fant ikke siden</h1>
      <p>
        <Link to="/">Tilbake til forsiden</Link>
      </p>
    </section>
  )
}
