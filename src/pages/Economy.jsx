import { useMemo, useState } from 'react'
import { Alert, Form, Table } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import EndDateCell from '../components/EndDateCell'
import { insuranceTypeLabel, payerLabel } from '../content/insuranceTypes'
import { formatDate, formatMoney } from '../lib/format'
import { economySummary, paymentSchedule } from '../lib/overview'
import { usePolicies } from '../lib/usePolicies'

// One of the three big numbers at the top: what an amount is per month and per year.
function AmountCard({ title, year, month, fees, muted, note }) {
  return (
    <div className={`card-box econ-card${muted ? ' econ-card--muted' : ''}`}>
      <div className="econ-card-title">{title}</div>
      <div>
        <span className="econ-num">{formatMoney(month)}</span>
        <span className="lp-muted"> per måned</span>
      </div>
      <div className="lp-muted">{formatMoney(year)} per år</div>
      {fees > 0 && <div className="econ-card-note">Av dette er {formatMoney(fees)} gebyrer per år.</div>}
      {note && <div className="econ-card-note">{note}</div>}
    </div>
  )
}

// "12." for a monthly payment, "20. nov." for the others (the day alone says too little when it is yearly).
function payDay(item) {
  if (!item.next) return '–'
  if (item.frequency?.value === 'monthly') return `den ${item.day}.`
  return new Date(`${item.next}T00:00:00`).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })
}

// "Økonomi" — what you and your spouse/partner pay for insurance. Only policies where the payer is
// "Meg selv" or "Ektefelle / samboer": what a job, the housing association or others pay is left out.
// Amounts include invoice fees, so the numbers are what actually leaves your account.
export default function Economy() {
  const { policies, loading, error } = usePolicies()
  const [showExpired, setShowExpired] = useState(false)

  const eco = useMemo(
    () => economySummary(policies, new Date(), { includeExpired: showExpired }),
    [policies, showExpired],
  )
  const schedule = useMemo(() => paymentSchedule(policies, new Date()), [policies])
  const nextPayment = schedule.upcoming[0]

  return (
    <div>
      <div className="page-head">
        <h1>Økonomi</h1>
      </div>
      <p className="lp-muted">
        Forsikringene som du eller samboer/ektefelle betaler. Det jobben, sameiet eller andre betaler er ikke
        med her. Beløpene inkluderer fakturagebyr.
      </p>

      {error && <Alert variant="warning">{error}</Alert>}

      {loading ? (
        <p>Laster …</p>
      ) : (
        <>
          <div className="econ-cards">
            <AmountCard title="Jeg betaler" year={eco.me.year} month={eco.me.month} fees={eco.me.fees} />
            <AmountCard
              title="Samboer / ektefelle betaler"
              year={eco.spouse.year}
              month={eco.spouse.month}
              fees={eco.spouse.fees}
              muted={!eco.hasSpouseRows}
              note={eco.hasSpouseRows ? null : 'Ingen forsikringer er registrert med dem som betaler.'}
            />
            <AmountCard
              title="Husholdningen betaler"
              year={eco.household.year}
              month={eco.household.month}
              fees={eco.household.fees}
            />
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
                    <Link to={`/forsikringer?rediger=${policy.id}`}>Fornyes den automatisk? Åpne og slå det på</Link>
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
                    <th className="d-none d-lg-table-cell">Gyldig til / fornyes</th>
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
                        {row.total === null && (
                          <Link to={`/forsikringer?rediger=${row.policy.id}`} className="upper-link d-md-none">
                            Legg inn pris
                          </Link>
                        )}
                      </td>
                      <td className="d-none d-md-table-cell">{payerLabel(row.payer)}</td>
                      <td className="text-end text-nowrap">
                        {row.total !== null ? formatMoney(row.total / 12) : <span className="text-muted">–</span>}
                      </td>
                      <td className="text-end text-nowrap">
                        {row.total !== null ? formatMoney(row.total) : <span className="text-muted">–</span>}
                        {row.fee > 0 && <div className="policy-meta">inkl. {formatMoney(row.fee)} gebyr</div>}
                      </td>
                      <td className="d-none d-lg-table-cell">
                        <EndDateCell policy={row.policy} />
                      </td>
                      <td className="text-end text-nowrap">
                        <Link to={`/forsikringer?rediger=${row.policy.id}`} className="upper-link">
                          {row.total === null ? 'Legg inn pris' : 'Rediger'}
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
            {eco.feeNeedsFrequency > 0 && (
              <li>
                {eco.feeNeedsFrequency} {eco.feeNeedsFrequency === 1 ? 'forsikring har' : 'forsikringer har'} gebyr uten at
                det er oppgitt hvor ofte du betaler, så gebyret er ikke regnet med. Legg inn hyppighet under «Rediger».
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

          {/* When the payments happen, per insurer. */}
          {schedule.groups.length > 0 && (
            <section className="econ-payments">
              <h2 className="section-title">Betalinger</h2>

              {nextPayment ? (
                <div className="card-box next-payment">
                  <i className="bi bi-calendar-event" aria-hidden="true" />
                  <div>
                    <div className="lp-muted">Neste trekk</div>
                    <strong>{formatDate(nextPayment.next)}</strong>
                    {' · '}
                    {nextPayment.policy.insurer ? `${nextPayment.policy.insurer}, ` : ''}
                    {nextPayment.policy.title}
                    {nextPayment.amount !== null && <> · {formatMoney(nextPayment.amount)}</>}
                  </div>
                </div>
              ) : (
                <p className="lp-muted">
                  Legg inn hvor ofte du betaler og en betalingsdato under «Rediger», så ser du når neste trekk er.
                </p>
              )}

              {schedule.groups.map((group) => (
                <div key={group.key} className="card-box table-card payment-group">
                  <h3 className="payment-insurer">{group.insurer ?? 'Uten selskap'}</h3>
                  <Table responsive className="policy-table align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Forsikring</th>
                        <th>Hvor ofte</th>
                        <th className="d-none d-sm-table-cell">Trekkdag</th>
                        <th className="text-end">Beløp</th>
                        <th>Neste trekk</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((item) => (
                        <tr key={item.policy.id}>
                          <td>
                            <div className="fw-medium">{item.policy.title}</div>
                            <div className="policy-meta">{payerLabel(item.payer)} betaler</div>
                          </td>
                          <td>{item.frequency ? item.frequency.label : <span className="text-muted">–</span>}</td>
                          <td className="d-none d-sm-table-cell">{payDay(item)}</td>
                          <td className="text-end text-nowrap">
                            {item.amount !== null ? formatMoney(item.amount) : <span className="text-muted">–</span>}
                            {item.amount !== null && Number(item.policy.fee_per_payment) > 0 && (
                              <div className="policy-meta">inkl. {formatMoney(item.policy.fee_per_payment)} gebyr</div>
                            )}
                          </td>
                          <td className="text-nowrap">
                            {item.next ? (
                              formatDate(item.next)
                            ) : (
                              <Link to={`/forsikringer?rediger=${item.policy.id}`} className="upper-link">
                                Legg inn
                              </Link>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ))}

              {schedule.incomplete.length > 0 && (
                <p className="lp-muted">
                  {schedule.incomplete.length}{' '}
                  {schedule.incomplete.length === 1 ? 'forsikring mangler' : 'forsikringer mangler'} hyppighet eller
                  betalingsdato, så vi vet ikke når neste trekk er.
                </p>
              )}
            </section>
          )}
        </>
      )}
    </div>
  )
}
