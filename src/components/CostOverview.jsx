import { formatMoney } from '../lib/format'

// What you pay per month/year and a bar per coverage area. `cost` comes from costSummary() in lib/overview.js.
// Only policies that have not expired, have a price, and are paid by YOU are counted in the total;
// what others pay (job, housing association, spouse) is shown on its own line.
export default function CostOverview({ cost }) {
  if (cost.pricedCount === 0) {
    return (
      <p className="lp-muted mb-0">
        Legg inn pris på forsikringene dine (under «Mine forsikringer»), så ser du hva de koster samlet.
      </p>
    )
  }

  const max = cost.byArea.length > 0 ? Math.max(...cost.byArea.map((a) => a.year)) : 1

  return (
    <div>
      <div className="cost-total">
        <div className="lp-muted">Det du betaler selv</div>
        <span className="cost-total-num">{formatMoney(cost.month)}</span>
        <span className="lp-muted"> per måned</span>
        <div className="lp-muted">{formatMoney(cost.year)} per år</div>
      </div>

      {cost.byArea.length > 0 && (
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
      )}

      {cost.othersCount > 0 && (
        <p className="cost-others">
          <i className="bi bi-people me-1" aria-hidden="true" />
          Andre betaler {formatMoney(cost.othersYear)} per år for {cost.othersCount}{' '}
          {cost.othersCount === 1 ? 'forsikring' : 'forsikringer'} til deg.
        </p>
      )}

      {cost.missingPrice > 0 && (
        <p className="lp-muted mb-0 mt-3">
          {cost.missingPrice} {cost.missingPrice === 1 ? 'forsikring mangler' : 'forsikringer mangler'} pris og er ikke med i summen.
        </p>
      )}
    </div>
  )
}
