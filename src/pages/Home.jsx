import { Link } from 'react-router-dom'
import { site } from '../content/site'

export default function Home() {
  return (
    <section className="home">
      <h1>{site.tagline}</h1>
      <p className="home-lead">{site.description}</p>
      <Link to="/dashboard" className="home-cta">
        Kom i gang
      </Link>
    </section>
  )
}
