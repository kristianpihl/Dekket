import { formatMoney } from '../lib/format'

// Total cost per month/year and a bar per coverage area. `cost` comes from costSummary() in lib/overview.js.
// Only policies that have not expired and have a price are counted.
export default function CostOverview({ cost }) {
  if (cost.pricedCount === 0) {
    return (
      <p className="lp-muted mb-0">
        Legg inn pris på forsikringene dine (under «Mine forsikringer»), så ser du hva de koster samlet.
      </p>
    )
  }

  const max = Math.max(...cost.byArea.map((a) => a.year))

  return (
    <div>
      <div className="cost-total">
        <span className="cost-total-num">{formatMoney(cost.month)}</span>
        <span className="lp-muted"> per måned</span>
        <div className="lp-muted">{formatMoney(cost.year)} per år</div>
      </div>

      <ul className="bars">
        {cost.byArea.map((row) => (
          <li key={row.type}>
            <div className="bars-head">
              <span>{row.label}</span>
              <span>{formatMoney(row.year)}</span>
            </div>
            <div className="bars-track">
              <div className="bars-fill" style={{ width: `${Math.max(4, (row.year / max) * 100)}%` }} />
            </div>
          </li>
        ))}
      </ul>

      {cost.missingPrice > 0 && (
        <p className="lp-muted mb-0 mt-3">
          {cost.missingPrice} {cost.missingPrice === 1 ? 'forsikring mangler' : 'forsikringer mangler'} pris og er ikke med i summen.
        </p>
      )}
    </div>
  )
}
