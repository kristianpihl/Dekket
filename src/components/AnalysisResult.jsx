import { Link } from 'react-router-dom'
import { docKindLabel, insuranceTypeLabel } from '../content/insuranceTypes'
import { formatDate, formatMoney } from '../lib/format'

// One list of points from the analysis: a bold heading, a sentence of detail, and (if known) the page.
function Points({ title, icon, points, empty }) {
  if (!points || points.length === 0) {
    return empty ? (
      <section className="result-section">
        <h2 className="result-title">
          <i className={`bi bi-${icon}`} aria-hidden="true" /> {title}
        </h2>
        <p className="lp-muted mb-0">{empty}</p>
      </section>
    ) : null
  }
  return (
    <section className="result-section">
      <h2 className="result-title">
        <i className={`bi bi-${icon}`} aria-hidden="true" /> {title}
      </h2>
      <ul className="result-list">
        {points.map((p, i) => (
          <li key={i}>
            <strong>{p.item}</strong>
            {p.detail && <span> — {p.detail}</span>}
            {p.page != null && <span className="result-page"> (s. {p.page})</span>}
          </li>
        ))}
      </ul>
    </section>
  )
}

// Shows a saved analysis (`analysis.result`, shaped by api/_analysis.js).
export default function AnalysisResult({ analysis, children }) {
  const r = analysis.result
  const price =
    r.premium.amount_nok != null
      ? `${formatMoney(r.premium.amount_nok)}${r.premium.per === 'month' ? ' per måned' : r.premium.per === 'year' ? ' per år' : ''}`
      : null
  const period =
    r.period.valid_from || r.period.valid_to
      ? `${r.period.valid_from ? formatDate(r.period.valid_from) : '?'} – ${r.period.valid_to ? formatDate(r.period.valid_to) : '?'}`
      : null

  return (
    <div className="result">
      <div className="result-warning" role="note">
        <i className="bi bi-exclamation-triangle" aria-hidden="true" />
        <div>
          <strong>Laget av KI, og kan inneholde feil.</strong> Les alltid selve dokumentet, og spør
          forsikringsselskapet hvis du er i tvil. Du er selv ansvarlig for at du er dekket.{' '}
          <Link to="/vilkar">Les vilkårene</Link>
        </div>
      </div>

      {children}

      <section className="result-section">
        <h2 className="result-title">
          <i className="bi bi-card-text" aria-hidden="true" /> Kort fortalt
        </h2>
        <p className="result-summary">{r.summary}</p>
        <dl className="result-facts">
          <dt>Dokumenttype</dt>
          <dd>{docKindLabel(r.document_kind)}</dd>
          <dt>Type forsikring</dt>
          <dd>{insuranceTypeLabel(r.insurance_type)}</dd>
          {r.insurer && (
            <>
              <dt>Selskap</dt>
              <dd>{r.insurer}</dd>
            </>
          )}
          {period && (
            <>
              <dt>Periode</dt>
              <dd>
                {period}
                {r.period.note && <span className="lp-muted"> · {r.period.note}</span>}
              </dd>
            </>
          )}
          {price && (
            <>
              <dt>Pris</dt>
              <dd>{price}</dd>
            </>
          )}
        </dl>
      </section>

      <Points title="Dette sier dokumentet at er dekket" icon="check2-circle" points={r.covers} empty="Dokumentet beskriver ikke hva som er dekket." />
      <Points title="Dette dekkes ikke, og unntak" icon="x-circle" points={r.not_covered} />
      <Points title="Egenandel" icon="cash-coin" points={r.deductibles} />
      <Points title="Beløp og begrensninger" icon="rulers" points={r.limits} />
      <Points title="Krav og plikter du må kjenne til" icon="exclamation-circle" points={r.important_conditions} />

      {r.references_missing.length > 0 && (
        <section className="result-section">
          <h2 className="result-title">
            <i className="bi bi-file-earmark-plus" aria-hidden="true" /> Dokumenter som mangler
          </h2>
          <ul className="result-list">
            {r.references_missing.map((m, i) => (
              <li key={i}>
                <strong>{m.document}</strong>
                {m.why && <span> — {m.why}</span>}
              </li>
            ))}
          </ul>
          <Link to="/legg-til" className="btn btn-outline-primary btn-sm">
            Legg til dokument
          </Link>
        </section>
      )}

      {r.uncertainties.length > 0 && (
        <section className="result-section">
          <h2 className="result-title">
            <i className="bi bi-question-circle" aria-hidden="true" /> Uklart eller usikkert
          </h2>
          <ul className="result-list">
            {r.uncertainties.map((u, i) => (
              <li key={i}>{u}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
