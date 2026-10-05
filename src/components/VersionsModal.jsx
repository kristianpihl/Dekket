import { useState } from 'react'
import { Alert, Button, Form, InputGroup, Modal } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { formatBytes, formatDate, formatMoney } from '../lib/format'
import { openPolicyFile } from '../lib/policyActions'
import { parseAmount } from '../lib/policyFields'
import { ALLOWED_FILE_TYPES, FILE_ACCEPT, MAX_FILE_BYTES } from '../lib/uploadRules'
import { deleteVersion, uploadNewVersion } from '../lib/versionActions'
import { buildVersionList } from '../lib/versions'
import { useAuth } from './AuthProvider'

// "Hva endret seg": the lines under a version.
function ChangeLines({ changes }) {
  if (changes === null) return null // the first version has nothing to compare with
  if (changes.length === 0) {
    return (
      <p className="version-changes version-changes--none">
        Ingen endringer i pris eller datoer fra forrige versjon. Selve vilkårene kan likevel være endret; det kan
        analysen sammenligne senere.
      </p>
    )
  }
  return (
    <ul className="version-changes">
      {changes.map((c) => (
        <li key={c.key}>
          <strong>{c.label}:</strong> {c.from} → {c.to}
          {c.delta !== null && c.delta !== 0 && (
            <span className={c.delta > 0 ? 'delta delta--up' : 'delta delta--down'}>
              {' '}
              ({c.delta > 0 ? '+' : '−'}
              {formatMoney(Math.abs(c.delta))})
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}

// Dialog for one policy's document history, and for uploading a new version.
// `versions` = the policy's archived older versions (from useVersions). `onChanged` is called after any change.
export default function VersionsModal({ policy, versions, onClose, onChanged }) {
  const { user } = useAuth()
  const list = buildVersionList(policy, versions)

  const [adding, setAdding] = useState(false)
  const [file, setFile] = useState(null)
  const [note, setNote] = useState('')
  const [price, setPrice] = useState('')
  const [pricePeriod, setPricePeriod] = useState('year')
  const [validTo, setValidTo] = useState('')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function handleFile(e) {
    const picked = e.target.files[0] ?? null
    setError('')
    if (picked && !ALLOWED_FILE_TYPES.includes(picked.type)) {
      setError('Filen må være PDF, JPG eller PNG.')
      e.target.value = ''
      return setFile(null)
    }
    if (picked && picked.size > MAX_FILE_BYTES) {
      setError(`Filen er for stor (${formatBytes(picked.size)}). Maks ${formatBytes(MAX_FILE_BYTES)}.`)
      e.target.value = ''
      return setFile(null)
    }
    setFile(picked)
  }

  async function handleUpload(e) {
    e.preventDefault()
    setError('')
    if (!file) return setError('Velg en fil først.')

    // Only what the user filled in is changed on the policy; blank = unchanged.
    const updates = {}
    if (price.trim() !== '') {
      const amount = parseAmount(price)
      if (amount === null || amount < 0) return setError('Prisen må være et tall som ikke er negativt.')
      updates.annual_premium = Math.round(amount * (pricePeriod === 'month' ? 12 : 1) * 100) / 100
    }
    if (validTo) updates.valid_to = validTo

    setBusy(true)
    const message = await uploadNewVersion({ userId: user.id, policy, file, note, updates })
    setBusy(false)
    onChanged() // the new version is in place even if the price update failed
    if (message) return setError(message)

    setAdding(false)
    setFile(null)
    setNote('')
    setPrice('')
    setValidTo('')
    setConsent(false)
  }

  async function handleOpen(entry) {
    setError('')
    setError(await openPolicyFile({ file_path: entry.filePath }))
  }

  async function handleDelete(entry) {
    if (!window.confirm(`Slette versjon ${entry.number} («${entry.fileName}»)? Filen fjernes for godt.`)) return
    setError('')
    setBusy(true)
    const message = await deleteVersion(entry.row)
    setBusy(false)
    if (message) return setError(message)
    onChanged()
  }

  return (
    <Modal show onHide={busy ? undefined : onClose} centered scrollable size="lg">
      <Modal.Header closeButton={!busy}>
        <Modal.Title as="h2" className="modal-title-sm">
          Versjoner: {policy.title}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}

        <ul className="version-list">
          {list.map((entry) => (
            <li key={entry.id} className={`version${entry.current ? ' version--current' : ''}`}>
              <div className="version-head">
                <div>
                  <strong>Versjon {entry.number}</strong>
                  {entry.current && <span className="pill pill--ok ms-2">Nåværende</span>}
                  <div className="policy-meta">
                    {entry.addedAt ? `Lagt til ${formatDate(entry.addedAt)} · ` : ''}
                    {entry.fileName} ({formatBytes(entry.fileSize)})
                  </div>
                </div>
                <div className="version-actions">
                  <Button size="sm" variant="outline-primary" onClick={() => handleOpen(entry)}>
                    Åpne
                  </Button>
                  {!entry.current && (
                    <Button size="sm" variant="outline-danger" onClick={() => handleDelete(entry)} disabled={busy}>
                      Slett
                    </Button>
                  )}
                </div>
              </div>
              {entry.note && <p className="version-note">{entry.note}</p>}
              <ChangeLines changes={entry.changes} />
            </li>
          ))}
        </ul>

        {list.length === 1 && !adding && (
          <p className="lp-muted">
            Dette er den eneste versjonen. Når forsikringen fornyes og du får et nytt forsikringsbevis eller nye
            vilkår, laster du dem opp som en ny versjon her, så beholder du den gamle og ser hva som er endret.
          </p>
        )}

        {adding ? (
          <Form onSubmit={handleUpload} className="version-form">
            <h3 className="version-form-title">Last opp ny versjon</h3>

            <Form.Group className="mb-3" controlId="ver-file">
              <Form.Label>Fil (PDF, JPG eller PNG, maks {formatBytes(MAX_FILE_BYTES)})</Form.Label>
              <Form.Control type="file" accept={FILE_ACCEPT} onChange={handleFile} required />
            </Form.Group>

            <Form.Group className="mb-3" controlId="ver-note">
              <Form.Label>Hva er nytt? (valgfritt)</Form.Label>
              <Form.Control
                type="text"
                placeholder="F.eks. Fornyelse 2027, ny egenandel"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </Form.Group>

            <p className="lp-muted mb-2">
              Har pris eller dato endret seg? Fyll det inn, så oppdateres forsikringen og endringen vises i
              historikken. La stå tomt hvis uendret.
            </p>
            <div className="version-fields mb-3">
              <Form.Group controlId="ver-price">
                <Form.Label>Ny pris</Form.Label>
                <InputGroup>
                  <Form.Control
                    type="text"
                    inputMode="decimal"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                  <InputGroup.Text>kr</InputGroup.Text>
                  <Form.Select
                    aria-label="Prisen gjelder per"
                    value={pricePeriod}
                    onChange={(e) => setPricePeriod(e.target.value)}
                    className="premium-period"
                  >
                    <option value="year">per år</option>
                    <option value="month">per måned</option>
                  </Form.Select>
                </InputGroup>
              </Form.Group>
              <Form.Group controlId="ver-valid-to">
                <Form.Label>Ny gyldig til / fornyes</Form.Label>
                <Form.Control type="date" value={validTo} onChange={(e) => setValidTo(e.target.value)} />
              </Form.Group>
            </div>

            <Form.Check
              id="ver-consent"
              type="checkbox"
              className="consent-box mb-3"
              required
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              label={
                <>
                  Dokumentet kan inneholde personopplysninger, også om helse. Jeg samtykker til at Dekket lagrer det for
                  meg. Se{' '}
                  <Link to="/personvern" target="_blank">
                    personvernerklæringen
                  </Link>
                  .
                </>
              }
            />

            <div className="d-flex gap-2">
              <Button variant="outline-secondary" onClick={() => setAdding(false)} disabled={busy}>
                Avbryt
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? 'Laster opp …' : 'Last opp ny versjon'}
              </Button>
            </div>
          </Form>
        ) : (
          <Button onClick={() => setAdding(true)}>
            <i className="bi bi-plus-lg me-2" aria-hidden="true" />
            Last opp ny versjon
          </Button>
        )}
      </Modal.Body>
    </Modal>
  )
}
