import { useAuth } from '../components/AuthProvider'

// Logged-in only (guarded in routes.jsx). Becomes the overview of uploaded
// insurance policies in the next steps.
export default function Dashboard() {
  const { user } = useAuth()

  return (
    <section>
      <h1>Dine forsikringer</h1>
      <p className="text-muted">Innlogget som {user.email}</p>
      <p>Du har ikke lastet opp noen forsikringer ennå.</p>
    </section>
  )
}
