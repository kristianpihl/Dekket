// The big round number plus three small stats at the top of the dashboard.
export default function CoverageSummary({ areas, documentCount }) {
  const covered = areas.filter((a) => a.status !== 'none').length
  const toCheck = areas.filter((a) => a.status === 'check').length

  return (
    <div className="summary">
      <div className="ring">
        <span className="ring-num">
          {covered} av {areas.length}
        </span>
        <span className="ring-label">OMRÅDER DEKKET</span>
      </div>
      <div className="stats">
        <div className="stat">
          <div className="stat-num">{documentCount}</div>
          <div className="stat-label">dokumenter</div>
        </div>
        <div className="stat">
          <div className="stat-num" style={{ color: 'var(--color-primary)' }}>
            {toCheck}
          </div>
          <div className="stat-label">å sjekke</div>
        </div>
        <div className="stat">
          <div className="stat-num">{areas.length - covered}</div>
          <div className="stat-label">mangler</div>
        </div>
      </div>
    </div>
  )
}
