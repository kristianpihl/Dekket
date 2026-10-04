import { useState } from 'react'
import { Alert, Button, Form } from 'react-bootstrap'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../components/AuthProvider'

const MIN_PASSWORD_LENGTH = 8

// Supabase returns English error messages — show friendly Norwegian ones.
function friendlyError(error) {
  const msg = error.message || ''
  if (msg.includes('Invalid login credentials')) return 'Feil e-post eller passord.'
  if (msg.includes('Email not confirmed')) return 'Du må bekrefte e-postadressen din først. Sjekk innboksen.'
  if (msg.includes('already registered')) return 'Det finnes allerede en bruker med denne e-postadressen.'
  if (msg.includes('rate limit')) return 'For mange forsøk. Vent litt og prøv igjen.'
  if (msg.includes('at least')) return `Passordet må være minst ${MIN_PASSWORD_LENGTH} tegn.`
  return 'Noe gikk galt. Prøv igjen.'
}

export default function Login() {
  const { user, signIn, signUp } = useAuth()
  const location = useLocation()
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  // Already logged in (or just became logged in) → go to where they were headed.
  if (user) return <Navigate to={location.state?.from?.pathname || '/dashboard'} replace />

  const isRegister = mode === 'register'

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setInfo('')

    if (isRegister && password.length < MIN_PASSWORD_LENGTH) {
      setError(`Passordet må være minst ${MIN_PASSWORD_LENGTH} tegn.`)
      return
    }

    setBusy(true)
    const { data, error: authError } = isRegister
      ? await signUp(email, password)
      : await signIn(email, password)
    setBusy(false)

    if (authError) {
      setError(friendlyError(authError))
      return
    }

    // Supabase hides "email already registered" by returning a user with no identities.
    if (isRegister && data.user?.identities?.length === 0) {
      setError('Det finnes allerede en bruker med denne e-postadressen.')
      return
    }

    // With email confirmation ON there is no session yet — tell them to check email.
    if (isRegister && !data.session) {
      setInfo('Konto opprettet! Sjekk e-posten din og klikk på lenken for å bekrefte.')
    }
    // Otherwise a session now exists and the <Navigate> above takes over.
  }

  function switchMode() {
    setMode(isRegister ? 'login' : 'register')
    setError('')
    setInfo('')
  }

  return (
    <section className="auth-card">
      <h1>{isRegister ? 'Opprett konto' : 'Logg inn'}</h1>

      {error && <Alert variant="danger">{error}</Alert>}
      {info && <Alert variant="success">{info}</Alert>}

      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3" controlId="email">
          <Form.Label>E-post</Form.Label>
          <Form.Control
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="password">
          <Form.Label>Passord</Form.Label>
          <Form.Control
            type="password"
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {isRegister && (
            <Form.Text muted>Minst {MIN_PASSWORD_LENGTH} tegn.</Form.Text>
          )}
        </Form.Group>

        <Button type="submit" disabled={busy} className="w-100">
          {busy ? 'Vent …' : isRegister ? 'Opprett konto' : 'Logg inn'}
        </Button>
      </Form>

      <p className="auth-switch">
        {isRegister ? 'Har du allerede konto? ' : 'Ny her? '}
        <button type="button" className="link-button" onClick={switchMode}>
          {isRegister ? 'Logg inn' : 'Opprett konto'}
        </button>
      </p>
    </section>
  )
}
