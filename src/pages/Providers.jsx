import { useMemo, useState } from 'react'
import { Alert, Button } from 'react-bootstrap'
import ProviderCard from '../components/ProviderCard'
import ProviderModal from '../components/ProviderModal'
import { LOGO_BUCKET } from '../lib/policyActions'
import { normalizeName } from '../lib/providerFields'
import { supabase } from '../lib/supabaseClient'
import { usePolicies } from '../lib/usePolicies'
import { useProviders } from '../lib/useProviders'

// "Forsikringsselskaper" — contact details for the companies you have insurance with, so the phone number
// and the "report a claim" link are one tap away when something happens.
export default function Providers() {
  const { providers, logoUrls, loading, error: loadError, reload } = useProviders()
  const { policies } = usePolicies()
  const [modal, setModal] = useState(null) // null | { provider?, prefillName? }
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  // Insurers named on your policies that you haven't added as a provider yet.
  const suggestions = useMemo(() => {
    const known = new Set(providers.map((p) => normalizeName(p.name)))
    const seen = new Set()
    const names = []
    for (const p of policies) {
      const key = normalizeName(p.insurer)
      if (!key || known.has(key) || seen.has(key)) continue
      seen.add(key)
      names.push(p.insurer.trim())
    }
    return names
  }, [providers, policies])

  async function handleDelete(provider) {
    if (!window.confirm(`Slette «${provider.name}»? Forsikringene dine blir ikke berørt.`)) return
    setError('')
    setBusyId(provider.id)
    const { error: deleteError } = await supabase.from('providers').delete().eq('id', provider.id)
    if (deleteError) {
      console.error(deleteError)
      setBusyId(null)
      return setError('Kunne ikke slette selskapet. Prøv igjen.')
    }
    if (provider.logo_path) await supabase.storage.from(LOGO_BUCKET).remove([provider.logo_path])
    setBusyId(null)
    reload()
  }

  return (
    <div>
      <div className="page-head">
        <h1>Forsikringsselskaper</h1>
        <Button onClick={() => setModal({})}>
          <i className="bi bi-plus-lg me-2" aria-hidden="true" />
          Legg til
        </Button>
      </div>
      <p className="lp-muted">
        Samle kontaktopplysningene til selskapene dine på ett sted, så er telefonnummer og lenken for å melde
        skade like ved når du trenger dem.
      </p>

      {loadError && <Alert variant="warning">{loadError}</Alert>}
      {error && <Alert variant="danger">{error}</Alert>}

      {suggestions.length > 0 && (
        <div className="suggest-chips">
          <span className="lp-muted">Fra forsikringene dine:</span>
          {suggestions.map((name) => (
            <button key={name} type="button" className="chip" onClick={() => setModal({ prefillName: name })}>
              <i className="bi bi-plus-lg me-1" aria-hidden="true" />
              {name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <p>Laster …</p>
      ) : providers.length === 0 ? (
        <div className="card-box empty">
          <span className="icon-circle icon-circle--lg">
            <i className="bi bi-building" aria-hidden="true" />
          </span>
          <h2>Ingen selskaper ennå</h2>
          <p className="text-muted">Legg til selskapene du har forsikring hos.</p>
          <Button onClick={() => setModal({})}>Legg til selskap</Button>
        </div>
      ) : (
        <div className="provider-grid">
          {providers.map((p) => (
            <ProviderCard
              key={p.id}
              provider={p}
              logoUrl={p.logo_path ? logoUrls[p.logo_path] : null}
              policies={policies.filter((x) => normalizeName(x.insurer) === normalizeName(p.name))}
              busy={busyId === p.id}
              onEdit={() => setModal({ provider: p })}
              onDelete={() => handleDelete(p)}
            />
          ))}
        </div>
      )}

      {modal && (
        <ProviderModal
          key={modal.provider?.id ?? `new-${modal.prefillName ?? ''}`}
          provider={modal.provider ?? null}
          logoUrl={modal.provider?.logo_path ? logoUrls[modal.provider.logo_path] : null}
          prefillName={modal.prefillName ?? ''}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null)
            reload()
          }}
        />
      )}
    </div>
  )
}
