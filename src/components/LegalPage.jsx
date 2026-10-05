import { Link } from 'react-router-dom'
import { LEGAL_DRAFT, LEGAL_UPDATED } from '../content/legal'

// Shared frame for the legal pages: title, "last updated", and a draft warning.
export default function LegalPage({ title, children }) {
  return (
    <div className="page">
      <article className="legal">
        <Link to="/" className="legal-back">
          <i className="bi bi-arrow-left me-2" aria-hidden="true" />
          Til forsiden
        </Link>
        <h1>{title}</h1>
        <p className="legal-updated">Sist oppdatert {LEGAL_UPDATED}</p>
        {LEGAL_DRAFT && (
          <div className="legal-draft">
            <strong>Utkast.</strong> Denne teksten er ikke juridisk gjennomgått ennå. Felt i
            gul markering må fylles ut før lansering.
          </div>
        )}
        {children}
      </article>
    </div>
  )
}

export function LegalSection({ title, children }) {
  return (
    <section className="legal-section">
      <h2>{title}</h2>
      {children}
    </section>
  )
}

// Highlights a value that still has to be filled in, e.g. <Fill>{operator.email}</Fill>.
export function Fill({ children }) {
  const text = String(children)
  return text.startsWith('[FYLL INN') ? <mark className="legal-fill">{text}</mark> : text
}
