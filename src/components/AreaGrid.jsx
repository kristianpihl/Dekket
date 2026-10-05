import { Link } from 'react-router-dom'

const PILL = {
  ok: 'pill--ok',
  soon: 'pill--warn',
  expired: 'pill--warn',
  'no-date': 'pill--warn',
  none: 'pill--none',
}

// One card per coverage area (bolig, innbo, bil, …) with a small status pill.
// An area with no policy links straight to the "add" flow.
export default function AreaGrid({ areas }) {
  return (
    <div className="areas">
      {areas.map((area) => {
        const card = (
          <>
            <div className="area-head">
              <span className="icon-circle">
                <i className={`bi bi-${area.icon}`} aria-hidden="true" />
              </span>
              <span className={`pill ${PILL[area.status]}`}>{area.label}</span>
            </div>
            <div className="area-name">{area.name}</div>
            <div className="area-note">{area.note}</div>
          </>
        )
        const className = `card-box area${area.status === 'none' ? ' area--empty' : ''}`
        return area.status === 'none' ? (
          <Link key={area.id} to="/legg-til" className={`${className} area--link`}>
            {card}
          </Link>
        ) : (
          <div key={area.id} className={className}>
            {card}
          </div>
        )
      })}
    </div>
  )
}
