// One card per coverage area (innbo, reise, liv, …) with a small status pill.
export default function AreaGrid({ areas }) {
  return (
    <div className="areas">
      {areas.map((area) => (
        <div
          key={area.id}
          className={`card-box area${area.status === 'none' ? ' area--empty' : ''}`}
        >
          <div className="area-head">
            <span className="icon-circle">
              <i className={`bi bi-${area.icon}`} aria-hidden="true" />
            </span>
            <span className={`pill ${area.status === 'check' ? 'pill--warn' : 'pill--none'}`}>
              {area.label}
            </span>
          </div>
          <div className="area-name">{area.name}</div>
          <div className="area-note">{area.note}</div>
        </div>
      ))}
    </div>
  )
}
