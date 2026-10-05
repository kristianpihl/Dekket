import { formatMoney } from '../lib/format'

// "Hvem har tegnet" — how the policies are spread across you, your job, the housing association, a spouse …
// `rows` come from holderBreakdown() in lib/overview.js.
export default function HolderBreakdown({ rows }) {
  if (rows.length === 0) return <p className="lp-muted mb-0">Ingen aktive forsikringer ennå.</p>

  return (
    <ul className="rows">
      {rows.map((r) => (
        <li key={r.holder} className="rows-item">
          <div className="rows-main">
            <div className="rows-title">{r.label}</div>
            {r.year > 0 && <div className="rows-note">{formatMoney(r.year)} per år</div>}
          </div>
          <span className="rows-count">
            {r.count} {r.count === 1 ? 'forsikring' : 'forsikringer'}
          </span>
        </li>
      ))}
    </ul>
  )
}
