import { useCallback, useEffect, useState } from 'react'
import { Alert } from 'react-bootstrap'
import { useAuth } from '../components/AuthProvider'
import PolicyList from '../components/PolicyList'
import UploadPolicyForm from '../forms/UploadPolicyForm'
import { supabase } from '../lib/supabaseClient'

// Logged-in only (guarded in routes.jsx). Shows the user's uploaded insurance
// documents and the upload form.
export default function Dashboard() {
  const { user } = useAuth()
  const [policies, setPolicies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    // RLS makes this return only the logged-in user's own rows.
    const { data, error: loadError } = await supabase
      .from('policies')
      .select('*')
      .order('created_at', { ascending: false })

    if (loadError) {
      console.error(loadError)
      setError(
        'Kunne ikke hente forsikringene dine. Er databasen satt opp? (Kjør supabase/documents.sql i Supabase.)',
      )
    } else {
      setError('')
      setPolicies(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <section>
      <h1>Dine forsikringer</h1>
      <p className="text-muted">Innlogget som {user.email}</p>

      {error && <Alert variant="warning">{error}</Alert>}

      {loading ? <p>Laster …</p> : <PolicyList policies={policies} onChanged={load} />}

      <hr />
      <UploadPolicyForm onUploaded={load} />
    </section>
  )
}
