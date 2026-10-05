import { Link } from 'react-router-dom'
import { formatDate, formatMoney } from '../lib/format'

function daysText(days) {
  if (days === 0) return 'I dag'
  if (days === 1) return 'I morgen'
  return `Om ${days} dager`
}

// Changes the insurers have announced ("from 1 January the price rises to …"), soonest first.
// `changes` come from announcedChanges(...).upcoming in lib/overview.js.
export default function AnnouncedChanges({ changes }) {
  return (
    <ul className="rows">
      {changes.map(({ policy, date, days, note, from, to, delta }) => (
        <li key={policy.id} className="rows-item rows-item--top">
          <div className="rows-main">
            <div className="rows-title">
              <Link to={`/forsikringer?rediger=${policy.id}`} className="plain-link">
                {policy.title}
              </Link>
            </div>
            <div className="rows-note">
              Fra {formatDate(date)}
              {to !== null && (
                <>
                  {' · '}
                  {from !== null ? `${formatMoney(from)} → ` : ''}
                  {formatMoney(to)} per år
                  {delta !== null && delta !== 0 && (
                    <span className={delta > 0 ? 'delta delta--up' : 'delta delta--down'}>
                      {' '}
                      ({delta > 0 ? '+' : '−'}
                      {formatMoney(Math.abs(delta))})
                    </span>
                  )}
                </>
              )}
            </div>
            {note && <div className="rows-note">{note}</div>}
          </div>
          <span className="pill pill--warn">{daysText(days)}</span>
        </li>
      ))}
    </ul>
  )
}
