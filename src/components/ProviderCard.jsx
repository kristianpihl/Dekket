import { Button } from 'react-bootstrap'
import { phoneHref } from '../lib/providerFields'
import ProviderLogo from './ProviderLogo'

// One insurance provider: logo, quick actions (report a claim, call, website, e-mail) and the details.
// `policies` = the user's policies with this insurer (matched by name).
export default function ProviderCard({ provider: p, logoUrl, policies, onEdit, onDelete, busy }) {
  const claimsPhone = phoneHref(p.claims_phone)
  const phone = phoneHref(p.phone)
  const hasActions = p.claims_url || claimsPhone || phone || p.website_url || p.email

  return (
    <article className="card-box provider">
      <header className="provider-head">
        <ProviderLogo name={p.name} url={logoUrl} size={52} />
        <h2 className="provider-name">{p.name}</h2>
      </header>

      {hasActions ? (
        <div className="provider-actions">
          {p.claims_url && (
            <a className="btn btn-primary btn-sm" href={p.claims_url} target="_blank" rel="noopener noreferrer">
              <i className="bi bi-exclamation-triangle me-1" aria-hidden="true" />
              Meld skade
            </a>
          )}
          {claimsPhone && (
            <a className="btn btn-outline-primary btn-sm" href={claimsPhone}>
              <i className="bi bi-telephone me-1" aria-hidden="true" />
              Skade: {p.claims_phone}
            </a>
          )}
          {phone && (
            <a className="btn btn-outline-primary btn-sm" href={phone}>
              <i className="bi bi-telephone me-1" aria-hidden="true" />
              {p.phone}
            </a>
          )}
          {p.website_url && (
            <a className="btn btn-outline-primary btn-sm" href={p.website_url} target="_blank" rel="noopener noreferrer">
              <i className="bi bi-globe me-1" aria-hidden="true" />
              Nettside
            </a>
          )}
          {p.email && (
            <a className="btn btn-outline-primary btn-sm" href={`mailto:${p.email}`}>
              <i className="bi bi-envelope me-1" aria-hidden="true" />
              E-post
            </a>
          )}
        </div>
      ) : (
        <p className="lp-muted mb-0">Ingen kontaktopplysninger lagt inn ennå. Trykk «Rediger».</p>
      )}

      {(p.address || p.customer_number || p.notes) && (
        <dl className="provider-facts">
          {p.customer_number && (
            <>
              <dt>Kundenummer</dt>
              <dd>{p.customer_number}</dd>
            </>
          )}
          {p.address && (
            <>
              <dt>Adresse</dt>
              <dd className="provider-multiline">{p.address}</dd>
            </>
          )}
          {p.notes && (
            <>
              <dt>Notater</dt>
              <dd className="provider-multiline">{p.notes}</dd>
            </>
          )}
        </dl>
      )}

      <div className="provider-policies">
        <span className="lp-muted">Dine forsikringer her: </span>
        {policies.length === 0 ? (
          <span className="lp-muted">ingen</span>
        ) : (
          policies.map((x) => x.title).join(', ')
        )}
      </div>

      <footer className="provider-foot">
        <Button size="sm" variant="outline-primary" onClick={onEdit}>
          Rediger
        </Button>
        <Button size="sm" variant="outline-danger" onClick={onDelete} disabled={busy}>
          Slett
        </Button>
      </footer>
    </article>
  )
}
