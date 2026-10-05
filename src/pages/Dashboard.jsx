import { Link } from 'react-router-dom'
import AreaGrid from '../components/AreaGrid'
import CoverageSummary from '../components/CoverageSummary'
import TodoList from '../components/TodoList'
import { sampleAreas, sampleTodos } from '../content/sampleOverview'
import { usePolicies } from '../lib/usePolicies'

// Overview page. The coverage overview uses example data until the analysis exists;
// the document count is real.
export default function Dashboard() {
  const { policies, loading } = usePolicies()
  const toCheck = sampleAreas.filter((a) => a.status === 'check').length

  return (
    <div className="dash">
      <section className="dash-hero">
        <h1>Slik står det til med dekningen din</h1>
        <p className="dash-sub">
          {loading
            ? 'Henter dokumentene dine …'
            : `Du har lagt til ${policies.length} ${policies.length === 1 ? 'forsikring' : 'forsikringer'}. ${toCheck} ting er verdt å sjekke.`}
        </p>
        <Link to="/legg-til" className="cta">
          <i className="bi bi-plus-lg me-2" aria-hidden="true" />
          Legg til forsikring
        </Link>
      </section>

      <div className="sample-note">
        Eksempeldata: dekningsoversikten er et utkast til designet. Analysen kommer senere. Antall
        forsikringer er ekte.
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
  )
}
