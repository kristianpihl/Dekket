import { Link } from 'react-router-dom'
import { useAuth } from '../components/AuthProvider'
import { site } from '../content/site'

export default function Home() {
  const { user } = useAuth()

  return (
    <section className="home">
      <h1>{site.tagline}</h1>
      <p className="home-lead">{site.description}</p>
      <Link to={user ? '/dashboard' : '/login'} className="home-cta">
        Kom i gang
      </Link>
    </section>
  )
}
