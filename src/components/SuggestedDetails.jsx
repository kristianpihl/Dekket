import { useMemo, useState } from 'react'
import { Alert, Button, Form } from 'react-bootstrap'
import { docKindLabel, insuranceTypeLabel } from '../content/insuranceTypes'
import { formatDate, formatMoney } from '../lib/format'
import { supabase } from '../lib/supabaseClient'

const shown = (v, fallback = 'ikke oppgitt') => (v == null || v === '' || v === false ? fallback : v)

// Compares what the analysis found with what is registered on the policy, and lists the differences.
// Nothing changes until the user ticks the boxes they agree with and presses the button.
function buildSuggestions(policy, result) {
  const list = []

  if (result.insurance_type !== 'other' && result.insurance_type !== policy.insurance_type) {
    list.push({
      key: 'insurance_type',
      label: 'Type forsikring',
      from: insuranceTypeLabel(policy.insurance_type),
      to: insuranceTypeLabel(result.insurance_type),
      patch: { insurance_type: result.insurance_type },
    })
  }
  if (result.document_kind !== policy.doc_kind) {
    list.push({
      key: 'doc_kind',
      label: 'Dokumenttype',
      from: docKindLabel(policy.doc_kind),
      to: docKindLabel(result.document_kind),
      patch: { doc_kind: result.document_kind },
    })
  }
  if (result.insurer && result.insurer !== policy.insurer) {
    list.push({ key: 'insurer', label: 'Selskap', from: shown(policy.insurer), to: result.insurer, patch: { insurer: result.insurer } })
  }
  if (result.period.valid_from && result.period.valid_from !== policy.valid_from) {
    list.push({
      key: 'valid_from',
      label: 'Gyldig fra',
      from: shown(policy.valid_from && formatDate(policy.valid_from)),
      to: formatDate(result.period.valid_from),
      patch: { valid_from: result.period.valid_from },
    })
  }
  if (result.period.valid_to && result.period.valid_to !== policy.valid_to) {
    list.push({
      key: 'valid_to',
      label: 'Gyldig til',
      from: shown(policy.valid_to && formatDate(policy.valid_to)),
      to: formatDate(result.period.valid_to),
      patch: { valid_to: result.period.valid_to },
    })
  }
  if (result.premium.amount_nok != null && result.premium.per) {
    const annual = Math.round(result.premium.amount_nok * (result.premium.per === 'month' ? 12 : 1) * 100) / 100
    if (annual !== Number(policy.annual_premium)) {
      list.push({
        key: 'annual_premium',
        label: 'Pris per år',
        from: shown(policy.annual_premium != null && formatMoney(policy.annual_premium)),
        to: formatMoney(annual),
        patch: { annual_premium: annual },
      })
    }
  }
  return list
}

// "Fra analysen": offers to copy facts the analysis found onto the policy.
export default function SuggestedDetails({ policy, result, onApplied }) {
  const suggestions = useMemo(() => buildSuggestions(policy, result), [policy, result])
  const [unchecked, setUnchecked] = useState(() => new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (suggestions.length === 0) return null

  const chosen = suggestions.filter((s) => !unchecked.has(s.key))

  function toggle(key) {
    setUnchecked((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function apply() {
    setBusy(true)
    setError('')
    const patch = Object.assign({}, ...chosen.map((s) => s.patch))
    const { error: saveError } = await supabase.from('policies').update(patch).eq('id', policy.id)
    setBusy(false)
    if (saveError) {
      console.error(saveError)
      setError('Kunne ikke lagre. Prøv igjen.')
      return
    }
    onApplied()
  }

  return (
    <section className="result-section suggest">
      <h2 className="result-title">
        <i className="bi bi-magic" aria-hidden="true" /> Fra analysen: vil du oppdatere opplysningene?
      </h2>
      <p className="lp-muted">
        Dette fant analysen i dokumentet, og det er annerledes enn det som er registrert. Kryss av for
        det du vil bruke. Sjekk gjerne mot dokumentet først.
      </p>
      {error && <Alert variant="danger">{error}</Alert>}
      <ul className="suggest-list">
        {suggestions.map((s) => (
          <li key={s.key}>
            <Form.Check
              id={`suggest-${s.key}`}
              type="checkbox"
              checked={!unchecked.has(s.key)}
              onChange={() => toggle(s.key)}
              label={
                <>
                  <strong>{s.label}:</strong> <span className="lp-muted">{s.from}</span> → {s.to}
                </>
              }
            />
          </li>
        ))}
      </ul>
      <Button size="sm" onClick={apply} disabled={busy || chosen.length === 0}>
        {busy ? 'Lagrer …' : 'Bruk valgte'}
      </Button>
    </section>
  )
}
