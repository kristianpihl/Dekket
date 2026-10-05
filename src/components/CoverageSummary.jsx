// The big round number plus three small stats at the top of the dashboard.
// `areas` come from buildAreas() in lib/overview.js.
export default function CoverageSummary({ areas, policyCount, attention }) {
  const registered = areas.filter((a) => a.status !== 'none').length
  const notAdded = areas.length - registered

  return (
    <div className="summary">
      <div className="ring">
        <span className="ring-num">
          {registered} av {areas.length}
        </span>
        <span className="ring-label">OMRÅDER REGISTRERT</span>
      </div>
      <div className="stats">
        <div className="stat">
          <div className="stat-num">{policyCount}</div>
          <div className="stat-label">{policyCount === 1 ? 'forsikring' : 'forsikringer'}</div>
        </div>
        <div className="stat">
          <div className="stat-num" style={attention > 0 ? { color: 'var(--color-primary)' } : undefined}>
            {attention}
          </div>
          <div className="stat-label">å følge opp</div>
        </div>
        <div className="stat">
          <div className="stat-num">{notAdded}</div>
          <div className="stat-label">ikke lagt til</div>
        </div>
      </div>
    </div>
  )
}
