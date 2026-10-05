import { useCallback, useEffect, useState } from 'react'
import { Alert } from 'react-bootstrap'
import AreaGrid from '../components/AreaGrid'
import CoverageSummary from '../components/CoverageSummary'
import PolicyList from '../components/PolicyList'
import TodoList from '../components/TodoList'
import { sampleAreas, sampleTodos } from '../content/sampleOverview'
import UploadPolicyForm from '../forms/UploadPolicyForm'
import { supabase } from '../lib/supabaseClient'

// Logged-in only (guarded in routes.jsx).
// Left/top: the coverage overview (example data for now). Right/bottom: the user's
// real uploaded documents and the upload form.
export default function Dashboard() {
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

  const toCheck = sampleAreas.filter((a) => a.status === 'check').length

  return (
    <>
      <section className="dash-hero">
        <h1>Slik står det til med dekningen din</h1>
        <p className="dash-sub">
          {loading
            ? 'Henter dokumentene dine …'
            : `Du har lastet opp ${policies.length} ${policies.length === 1 ? 'dokument' : 'dokumenter'}. ${toCheck} ting er verdt å sjekke.`}
        </p>
        <a href="#last-opp" className="cta">
          <i className="bi bi-upload me-2" aria-hidden="true" />
          Last opp dokument
        </a>
      </section>

      <div className="dash-grid">
        <div className="dash-main">
          <div className="sample-note">
            Eksempeldata: dekningsoversikten er et utkast til designet. Analysen kommer senere.
            Dokumentene og opplastingen er ekte.
          </div>

          <CoverageSummary areas={sampleAreas} documentCount={policies.length} />

          <section>
            <h2 className="section-title">Dine områder</h2>
            <AreaGrid areas={sampleAreas} />
          </section>

          <section>
            <h2 className="section-title">Dette bør du gjøre</h2>
            <TodoList todos={sampleTodos} />
          </section>
        </div>

        <aside className="dash-side">
          <section>
            <h2 className="section-title">Dokumenter</h2>
            {error && <Alert variant="warning">{error}</Alert>}
            {loading ? <p>Laster …</p> : <PolicyList policies={policies} onChanged={load} />}
          </section>

          <section id="last-opp" className="card-box upload-card">
            <UploadPolicyForm onUploaded={load} />
          </section>
        </aside>
      </div>
    </>
  )
}
