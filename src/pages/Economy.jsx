import { useMemo, useState } from 'react'
import { Alert, Form, Table } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { insuranceTypeLabel, payerLabel } from '../content/insuranceTypes'
import { formatDate, formatMoney } from '../lib/format'
import { daysUntil, economySummary } from '../lib/overview'
import { usePolicies } from '../lib/usePolicies'

// One of the three big numbers at the top: what an amount is per month and per year.
function AmountCard({ title, year, month, muted, note }) {
  return (
    <div className={`card-box econ-card${muted ? ' econ-card--muted' : ''}`}>
      <div className="econ-card-title">{title}</div>
      <div>
        <span className="econ-num">{formatMoney(month)}</span>
        <span className="lp-muted"> per måned</span>
      </div>
      <div className="lp-muted">{formatMoney(year)} per år</div>
      {note && <div className="econ-card-note">{note}</div>}
    </div>
  )
}

// A row's "valid until" cell: the date, plus a small pill when it has ended or ends soon.
function ValidUntil({ row }) {
  const { policy, status } = row
  if (status === 'no-date') return <span className="text-muted">–</span>
  const days = daysUntil(policy.valid_to)
  return (
    <>
      {formatDate(policy.valid_to)}
      {status === 'expired' && <span className="pill pill--warn ms-2">Utløpt</span>}
      {status === 'soon' && (
        <span className="pill pill--warn ms-2">
          Om {days} {days === 1 ? 'dag' : 'dager'}
        </span>
      )}
    </>
  )
}

// "Økonomi" — what you and your spouse/partner pay for insurance. Only policies where the payer is
// "Meg selv" or "Ektefelle / samboer": what a job, the housing association or others pay is left out.
export default function Economy() {
  const { policies, loading, error } = usePolicies()
  const [showExpired, setShowExpired] = useState(false)

  const eco = useMemo(
    () => economySummary(policies, new Date(), { includeExpired: showExpired }),
    [policies, showExpired],
  )

  return (
    <div>
      <div className="page-head">
        <h1>Økonomi</h1>
      </div>
      <p className="lp-muted">
        Forsikringene som du eller samboer/ektefelle betaler. Det jobben, sameiet eller andre betaler er ikke
        med her.
      </p>

      {error && <Alert variant="warning">{error}</Alert>}

      {loading ? (
        <p>Laster …</p>
      ) : (
        <>
          <div className="econ-cards">
            <AmountCard title="Jeg betaler" year={eco.me.year} month={eco.me.month} />
            <AmountCard
              title="Samboer / ektefelle betaler"
              year={eco.spouse.year}
              month={eco.spouse.month}
              muted={!eco.hasSpouseRows}
              note={eco.hasSpouseRows ? null : 'Ingen forsikringer er registrert med dem som betaler.'}
            />
            <AmountCard title="Husholdningen betaler" year={eco.household.year} month={eco.household.month} />
          </div>

          {/* Expired policies are left out of the totals. Say which ones, so nothing seems to have vanished. */}
          {!showExpired && eco.expiredRows.length > 0 && (
            <Alert variant="warning" className="econ-expired-alert">
              <strong>
                {eco.expiredRows.length} {eco.expiredRows.length === 1 ? 'forsikring er' : 'forsikringer er'} utløpt og ikke
                med i summene:
              </strong>
              <ul className="econ-excluded">
                {eco.expiredRows.map(({ policy, payer }) => (
                  <li key={policy.id}>
                    {policy.title} ({payerLabel(payer)} betaler) gikk ut {formatDate(policy.valid_to)}.{' '}
                    <Link to={`/forsikringer?rediger=${policy.id}`}>Er den fornyet? Oppdater datoen</Link>
                  </li>
                ))}
              </ul>
              <button type="button" className="link-button" onClick={() => setShowExpired(true)}>
                Vis dem i tabellen
              </button>
            </Alert>
          )}

          {eco.rows.length === 0 ? (
            <div className="card-box empty">
              <span className="icon-circle icon-circle--lg">
                <i className="bi bi-wallet2" aria-hidden="true" />
              </span>
              <h2>Ingen forsikringer å vise</h2>
              <p className="text-muted">
                Her vises forsikringer der «Hvem betaler?» er satt til deg selv eller samboer/ektefelle.
              </p>
              <Link to="/legg-til" className="btn btn-primary">
                Legg til forsikring
              </Link>
            </div>
          ) : (
            <div className="card-box table-card">
              <Table responsive className="policy-table econ-table align-middle mb-0">
                <thead>
                  <tr>
                    <th>Forsikring</th>
                    <th className="d-none d-md-table-cell">Betaler</th>
                    <th className="text-end">Per måned</th>
                    <th className="text-end">Per år</th>
                    <th className="d-none d-lg-table-cell">Gyldig til</th>
                    <th aria-label="Handlinger" />
                  </tr>
                </thead>
                <tbody>
                  {eco.rows.map((row) => (
                    <tr key={row.policy.id} className={row.status === 'expired' ? 'econ-expired' : undefined}>
                      <td>
                        <div className="fw-medium">{row.policy.title}</div>
                        <div className="policy-meta">
                          {insuranceTypeLabel(row.policy.insurance_type)}
                          {row.policy.insurer ? ` · ${row.policy.insurer}` : ''}
                        </div>
                        <div className="policy-meta d-md-none">Betaler: {payerLabel(row.payer)}</div>
                        {row.year === null && (
                          <Link to={`/forsikringer?rediger=${row.policy.id}`} className="upper-link d-md-none">
                            Legg inn pris
                          </Link>
                        )}
                      </td>
                      <td className="d-none d-md-table-cell">{payerLabel(row.payer)}</td>
                      <td className="text-end text-nowrap">
                        {row.year !== null ? formatMoney(row.year / 12) : <span className="text-muted">–</span>}
                      </td>
                      <td className="text-end text-nowrap">
                        {row.year !== null ? formatMoney(row.year) : <span className="text-muted">–</span>}
                      </td>
                      <td className="d-none d-lg-table-cell">
                        <ValidUntil row={row} />
                      </td>
                      <td className="text-end text-nowrap">
                        <Link to={`/forsikringer?rediger=${row.policy.id}`} className="upper-link">
                          {row.year === null ? 'Legg inn pris' : 'Rediger'}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={1} className="d-md-none econ-total-label">
                      Jeg betaler
                    </td>
                    <td colSpan={2} className="d-none d-md-table-cell econ-total-label">
                      Jeg betaler
                    </td>
                    <td className="text-end text-nowrap">{formatMoney(eco.me.month)}</td>
                    <td className="text-end text-nowrap">{formatMoney(eco.me.year)}</td>
                    <td className="d-none d-lg-table-cell" colSpan={2} />
                    <td className="d-lg-none" />
                  </tr>
                  {eco.hasSpouseRows && (
                    <tr>
                      <td colSpan={1} className="d-md-none econ-total-label">
                        Samboer / ektefelle
                      </td>
                      <td colSpan={2} className="d-none d-md-table-cell econ-total-label">
                        Samboer / ektefelle betaler
                      </td>
                      <td className="text-end text-nowrap">{formatMoney(eco.spouse.month)}</td>
                      <td className="text-end text-nowrap">{formatMoney(eco.spouse.year)}</td>
                      <td className="d-none d-lg-table-cell" colSpan={2} />
                      <td className="d-lg-none" />
                    </tr>
                  )}
                  <tr className="econ-grand">
                    <td colSpan={1} className="d-md-none econ-total-label">
                      Husholdningen
                    </td>
                    <td colSpan={2} className="d-none d-md-table-cell econ-total-label">
                      Husholdningen betaler
                    </td>
                    <td className="text-end text-nowrap">{formatMoney(eco.household.month)}</td>
                    <td className="text-end text-nowrap">{formatMoney(eco.household.year)}</td>
                    <td className="d-none d-lg-table-cell" colSpan={2} />
                    <td className="d-lg-none" />
                  </tr>
                </tfoot>
              </Table>
            </div>
          )}

          <ul className="econ-notes">
            {eco.missingPrice > 0 && (
              <li>
                {eco.missingPrice} {eco.missingPrice === 1 ? 'forsikring mangler' : 'forsikringer mangler'} pris og
                er ikke med i summene. Trykk «Legg inn pris» i tabellen.
              </li>
            )}
            {eco.paidByOthers > 0 && (
              <li>
                Betales av andre enn deg og samboer/ektefelle, og er ikke med her:
                <ul className="econ-excluded">
                  {eco.otherPayerPolicies.map((p) => (
                    <li key={p.id}>
                      {p.title} ({payerLabel(p.payer)} betaler).{' '}
                      <Link to={`/forsikringer?rediger=${p.id}`}>Feil? Endre «Hvem betaler?»</Link>
                    </li>
                  ))}
                </ul>
              </li>
            )}
            {(eco.expiredCount > 0 || showExpired) && (
              <li>
                <Form.Check
                  type="switch"
                  id="show-expired"
                  checked={showExpired}
                  onChange={(e) => setShowExpired(e.target.checked)}
                  label={`Vis utløpte forsikringer (${eco.expiredCount}). De er aldri med i summene.`}
                />
              </li>
            )}
          </ul>
        </>
      )}
    </div>
  )
}
