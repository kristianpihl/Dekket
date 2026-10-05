import { Link } from 'react-router-dom'
import { holderLabel } from '../content/insuranceTypes'
import { formatDate } from '../lib/format'

function daysText(days) {
  if (days < 0) return 'Utløpt'
  if (days === 0) return 'I dag'
  if (days === 1) return 'I morgen'
  return `Om ${days} dager`
}

// Policies with an end date, soonest first. `renewals` come from upcomingRenewals() in lib/overview.js.
export default function RenewalList({ renewals }) {
  if (renewals.length === 0) {
    return (
      <p className="lp-muted mb-0">
        Ingen forsikringer har sluttdato ennå. Legg inn datoer under{' '}
        <Link to="/forsikringer">Mine forsikringer</Link>, så vises de her.
      </p>
    )
  }

  return (
    <ul className="rows">
      {renewals.map(({ policy, days, status }) => (
        <li key={policy.id} className="rows-item">
          <div className="rows-main">
            <div className="rows-title">{policy.title}</div>
            <div className="rows-note">
              {formatDate(policy.valid_to)} · {holderLabel(policy.holder)}
            </div>
          </div>
          <span className={`pill ${status === 'ok' ? 'pill--none' : 'pill--warn'}`}>{daysText(days)}</span>
        </li>
      ))}
    </ul>
  )
}
