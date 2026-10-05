import { Alert } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { docKindLabel, insuranceTypeLabel } from '../content/insuranceTypes'
import { formatDate } from '../lib/format'
import { useAnalyses } from '../lib/useAnalyses'
import { usePolicies } from '../lib/usePolicies'

// "Analyse" — one row per uploaded document, showing whether it has been analysed.
// The analysis itself is started and shown on /analyse/:policyId (pages/AnalysisDetail.jsx).
export default function Analysis() {
  const policies = usePolicies()
  const analyses = useAnalyses()

  return (
    <div className="narrow narrow--wide">
      <div className="page-head">
        <h1>Analyse</h1>
      </div>
      <p className="lp-muted">
        Dekket kan lese dokumentene dine og forklare hva de sier: hva som er dekket, hva som ikke er det,
        egenandel og krav. Det er veiledende. Du er selv ansvarlig for at du er dekket.
      </p>

      {policies.error && <Alert variant="warning">{policies.error}</Alert>}
      {analyses.error && <Alert variant="warning">{analyses.error}</Alert>}

      {policies.loading || analyses.loading ? (
        <p>Laster …</p>
      ) : policies.policies.length === 0 ? (
        <div className="card-box empty">
          <span className="icon-circle icon-circle--lg">
            <i className="bi bi-stars" aria-hidden="true" />
          </span>
          <h2>Legg til en forsikring først</h2>
          <p className="text-muted">Når du har lastet opp et dokument, kan du analysere det her.</p>
          <Link to="/legg-til" className="btn btn-primary">
            Legg til forsikring
          </Link>
        </div>
      ) : (
        <ul className="rows card-box analysis-list">
          {policies.policies.map((p) => {
            const a = analyses.latest.get(p.id)
            return (
              <li key={p.id} className="rows-item">
                <div className="rows-main">
                  <div className="rows-title">{p.title}</div>
                  <div className="rows-note">
                    {insuranceTypeLabel(p.insurance_type)} · {docKindLabel(p.doc_kind)}
                  </div>
                </div>
                {a ? (
                  <span className="pill pill--ok">Analysert {formatDate(a.created_at)}</span>
                ) : (
                  <span className="pill pill--none">Ikke analysert</span>
                )}
                <Link to={`/analyse/${p.id}`} className={`btn btn-sm ${a ? 'btn-outline-primary' : 'btn-primary'}`}>
                  {a ? 'Se analyse' : 'Åpne'}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
