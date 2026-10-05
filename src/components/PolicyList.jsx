import { useState } from 'react'
import { Alert, Button } from 'react-bootstrap'
import { insuranceTypeLabel } from '../content/insuranceTypes'
import { formatBytes, formatDate } from '../lib/format'
import { supabase } from '../lib/supabaseClient'

const BUCKET = 'policies'

export default function PolicyList({ policies, onChanged }) {
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  // The bucket is private, so the browser can't link to a file directly.
  // We ask Supabase for a temporary link (valid 60 seconds) and open that.
  async function handleOpen(policy) {
    setError('')
    // Open the tab right away (inside the click) so popup blockers allow it.
    const tab = window.open('', '_blank')
    const { data, error: urlError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(policy.file_path, 60)

    if (urlError || !data) {
      tab?.close()
      setError('Kunne ikke åpne filen. Prøv igjen.')
      console.error(urlError)
      return
    }
    if (tab) tab.location.href = data.signedUrl
  }

  async function handleDelete(policy) {
    if (!window.confirm(`Slette «${policy.title}»? Filen fjernes for godt.`)) return
    setError('')
    setBusyId(policy.id)

    // Remove the file first, then the row (so we never keep a row pointing at nothing).
    const { error: fileError } = await supabase.storage.from(BUCKET).remove([policy.file_path])
    if (fileError) {
      setBusyId(null)
      setError('Kunne ikke slette filen. Prøv igjen.')
      console.error(fileError)
      return
    }
    const { error: rowError } = await supabase.from('policies').delete().eq('id', policy.id)
    setBusyId(null)
    if (rowError) {
      setError('Filen ble slettet, men oppføringen ble igjen. Last siden på nytt og prøv igjen.')
      console.error(rowError)
      return
    }
    onChanged()
  }

  if (policies.length === 0) {
    return <p className="text-muted">Du har ikke lastet opp noen dokumenter ennå.</p>
  }

  return (
    <>
      {error && <Alert variant="danger">{error}</Alert>}
      <ul className="policy-list">
        {policies.map((p) => (
          <li key={p.id} className="policy-item">
            <div className="policy-info">
              <strong>{p.title}</strong>
              <span className="policy-meta">
                {insuranceTypeLabel(p.insurance_type)}
                {p.insurer ? ` · ${p.insurer}` : ''} · {p.file_name} ({formatBytes(p.file_size)}) ·{' '}
                {formatDate(p.created_at)}
              </span>
            </div>
            <div className="policy-actions">
              <Button size="sm" variant="outline-primary" onClick={() => handleOpen(p)}>
                Åpne
              </Button>
              <Button
                size="sm"
                variant="outline-danger"
                disabled={busyId === p.id}
                onClick={() => handleDelete(p)}
              >
                Slett
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}
