import { useState } from 'react'
import { Alert, Button, Spinner } from 'react-bootstrap'
import { Link, useParams } from 'react-router-dom'
import AnalysisResult from '../components/AnalysisResult'
import SuggestedDetails from '../components/SuggestedDetails'
import { docKindLabel } from '../content/insuranceTypes'
import { runAnalysis } from '../lib/analysisApi'
import { formatDateTime } from '../lib/format'
import { useAnalyses } from '../lib/useAnalyses'
import { usePolicies } from '../lib/usePolicies'

// /analyse/:policyId — run the analysis for one document, or read the latest one.
export default function AnalysisDetail() {
  const { policyId } = useParams()
  const policies = usePolicies()
  const analyses = useAnalyses()
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')

  const policy = policies.policies.find((p) => p.id === policyId)
  const analysis = analyses.latest.get(policyId)

  async function start() {
    setRunning(true)
    setError('')
    const { error: runError } = await runAnalysis(policyId)
    setRunning(false)
    if (runError) {
      setError(runError)
      return
    }
    analyses.reload()
  }

  if (policies.loading || analyses.loading) return <p>Laster …</p>
  if (!policy) {
    return (
      <div className="narrow">
        <Alert variant="warning">Fant ikke dokumentet.</Alert>
        <Link to="/analyse">Tilbake til analyse</Link>
      </div>
    )
  }

  return (
    <div className="analysis-page">
      <Link to="/analyse" className="legal-back">
        <i className="bi bi-arrow-left me-2" aria-hidden="true" />
        Alle dokumenter
      </Link>

      <div className="page-head mt-3">
        <div>
          <h1>{policy.title}</h1>
          <div className="lp-muted">
            {docKindLabel(policy.doc_kind)}
            {policy.insurer ? ` · ${policy.insurer}` : ''}
          </div>
        </div>
        {analysis && !running && (
          <Button variant="outline-primary" onClick={start}>
            Analyser på nytt
          </Button>
        )}
      </div>

      {analyses.error && <Alert variant="warning">{analyses.error}</Alert>}
      {error && <Alert variant="danger">{error}</Alert>}

      {running && (
        <div className="card-box analysis-running" role="status">
          <Spinner animation="border" size="sm" className="me-2" />
          Dekket leser dokumentet … Det tar vanligvis under et minutt. Ikke lukk siden.
        </div>
      )}

      {!running && !analysis && (
        <div className="card-box empty">
          <span className="icon-circle icon-circle--lg">
            <i className="bi bi-stars" aria-hidden="true" />
          </span>
          <h2>Ikke analysert ennå</h2>
          <p className="text-muted analysis-consent">
            Når du starter, sendes dokumentet til Claude (laget av Anthropic) som leser det og lager et
            sammendrag. Resultatet er veiledende og kan inneholde feil.
          </p>
          <Button onClick={start}>Start analyse</Button>
        </div>
      )}

      {!running && analysis && (
        <>
          <p className="lp-muted">Analysert {formatDateTime(analysis.created_at)}</p>
          <AnalysisResult analysis={analysis}>
            <SuggestedDetails policy={policy} result={analysis.result} onApplied={() => policies.reload()} />
          </AnalysisResult>
        </>
      )}
    </div>
  )
}
