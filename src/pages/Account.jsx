import { useState } from 'react'
import { Alert, Button, Form, Modal } from 'react-bootstrap'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../components/AuthProvider'
import { deleteMyAccount } from '../lib/accountActions'
import { exportMyData, saveBlob } from '../lib/exportData'
import { formatDate } from '../lib/format'
import { supabase } from '../lib/supabaseClient'

const CONFIRM_WORD = 'slett'

// "Konto" — account info and the option to delete the account for good.
export default function Account() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [exp, setExp] = useState({ busy: false, status: '', error: '', done: false, failed: [], fileCount: 0 })

  const acceptedAt = user.user_metadata?.accepted_terms_at
  const acceptedVersion = user.user_metadata?.accepted_terms_version

  // Packs everything the user has in Dekket into one zip and hands it to the browser as a download.
  async function handleExport() {
    setExp({ busy: true, status: 'Starter …', error: '', done: false, failed: [], fileCount: 0 })
    try {
      const { blob, filename, failed, fileCount } = await exportMyData(user, (status) =>
        setExp((prev) => ({ ...prev, status })),
      )
      saveBlob(blob, filename)
      setExp({ busy: false, status: '', error: '', done: true, failed, fileCount })
    } catch (e) {
      console.error(e)
      setExp({ busy: false, status: '', error: e.message || 'Noe gikk galt. Prøv igjen.', done: false, failed: [], fileCount: 0 })
    }
  }

  async function handleDelete() {
    setBusy(true)
    setError('')
    const message = await deleteMyAccount(user.id)
    if (message) {
      setBusy(false)
      setError(message)
      return
    }
    // Leave the app first, then clear the local login (the account no longer exists on the server).
    navigate('/?slettet=1', { replace: true })
    await supabase.auth.signOut({ scope: 'local' })
  }

  function closeConfirm() {
    if (busy) return
    setShowConfirm(false)
    setConfirmText('')
    setError('')
  }

  return (
    <div className="narrow">
      <div className="page-head">
        <h1>Konto</h1>
      </div>

      <div className="card-box account-block">
        <h2 className="section-title">Kontoopplysninger</h2>
        <dl className="account-facts">
          <dt>E-post</dt>
          <dd>{user.email}</dd>
          {acceptedAt && (
            <>
              <dt>Vilkår godtatt</dt>
              <dd>
                {formatDate(acceptedAt)} (versjon {acceptedVersion})
              </dd>
            </>
          )}
        </dl>
        <p className="lp-muted mb-0">
          Les <Link to="/vilkar">vilkårene</Link> og <Link to="/personvern">personvernerklæringen</Link>.
        </p>
      </div>

      <div className="card-box account-block">
        <h2 className="section-title">Last ned dataene dine</h2>
        <p>
          Du kan få alt Dekket har lagret om deg som én zip-fil: kontoopplysninger, oversikten over
          forsikringene (åpnes i Excel), aktivitetsloggen og dokumentene du har lastet opp. Filen lages
          i nettleseren din.
        </p>
        {exp.error && <Alert variant="danger">{exp.error}</Alert>}
        {exp.done && (
          <Alert variant={exp.failed.length ? 'warning' : 'success'}>
            Filen er lastet ned ({exp.fileCount} {exp.fileCount === 1 ? 'dokument' : 'dokumenter'}).
            {exp.failed.length > 0 && (
              <>
                {' '}
                {exp.failed.length} {exp.failed.length === 1 ? 'fil' : 'filer'} kunne ikke hentes og mangler:{' '}
                {exp.failed.map((f) => f.title).join(', ')}. Prøv igjen.
              </>
            )}
          </Alert>
        )}
        <Button variant="outline-primary" onClick={handleExport} disabled={exp.busy}>
          <i className="bi bi-download me-2" aria-hidden="true" />
          {exp.busy ? exp.status : 'Last ned dataene mine'}
        </Button>
      </div>

      <div className="card-box account-block account-danger">
        <h2 className="section-title">Slett kontoen</h2>
        <p>
          Dette sletter kontoen din og alle forsikringene og dokumentene dine for godt. Det kan ikke
          angres. Vil du bare fjerne enkelte dokumenter, gjør du det under{' '}
          <Link to="/forsikringer">Mine forsikringer</Link>.
        </p>
        <Button variant="outline-danger" onClick={() => setShowConfirm(true)}>
          Slett kontoen min
        </Button>
      </div>

      <Modal show={showConfirm} onHide={closeConfirm} centered>
        <Modal.Header closeButton={!busy}>
          <Modal.Title as="h2" className="modal-title-sm">
            Slette kontoen for godt?
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <p>
            Alle forsikringer, dokumenter og kontoopplysninger slettes. Skriv <strong>{CONFIRM_WORD}</strong>{' '}
            for å bekrefte.
          </p>
          <Form.Control
            aria-label="Skriv slett for å bekrefte"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            autoComplete="off"
            disabled={busy}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={closeConfirm} disabled={busy}>
            Avbryt
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={busy || confirmText.trim().toLowerCase() !== CONFIRM_WORD}
          >
            {busy ? 'Sletter …' : 'Slett alt'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}
