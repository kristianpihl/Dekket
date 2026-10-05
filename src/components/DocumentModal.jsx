import { useRef, useState } from 'react'
import { Alert, Button, Form, Modal } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { documentCategories } from '../content/insuranceTypes'
import { LEGAL_VERSION } from '../content/legal'
import { documentFields, documentValues, emptyDocument } from '../lib/documentFields'
import { formatBytes } from '../lib/format'
import { POLICY_BUCKET } from '../lib/policyActions'
import { supabase } from '../lib/supabaseClient'
import { ALLOWED_FILE_TYPES, FILE_ACCEPT, MAX_FILE_BYTES } from '../lib/uploadRules'
import { useAuth } from './AuthProvider'

function withoutExtension(name) {
  return name.replace(/\.[^.]+$/, '')
}

// Dialog for adding a document that is not insurance (e.g. housing-association bylaws), or editing one.
// `document` = the row to edit, or null to add a new one. Mount it only while open
// (<DocumentModal key=… />) so it starts fresh each time.
export default function DocumentModal({ document: doc, onClose, onSaved }) {
  const { user } = useAuth()
  const editing = Boolean(doc)
  const fileInput = useRef(null)
  const [values, setValues] = useState(() => (doc ? documentValues(doc) : emptyDocument))
  const [file, setFile] = useState(null)
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const patch = (changes) => setValues((v) => ({ ...v, ...changes }))

  function handleFile(e) {
    const picked = e.target.files[0] ?? null
    setError('')
    if (picked && !ALLOWED_FILE_TYPES.includes(picked.type)) {
      setError('Filen må være PDF, JPG eller PNG.')
      e.target.value = ''
      setFile(null)
      return
    }
    if (picked && picked.size > MAX_FILE_BYTES) {
      setError(`Filen er for stor (${formatBytes(picked.size)}). Maks ${formatBytes(MAX_FILE_BYTES)}.`)
      e.target.value = ''
      setFile(null)
      return
    }
    setFile(picked)
    if (picked && !values.title) patch({ title: withoutExtension(picked.name) })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (editing) {
      if (!values.title.trim()) return setError('Dokumentet må ha en tittel.')
      setBusy(true)
      const { error: saveError } = await supabase.from('documents').update(documentFields(values)).eq('id', doc.id)
      setBusy(false)
      if (saveError) {
        console.error(saveError)
        return setError('Kunne ikke lagre. Har du kjørt supabase/payers-documents-providers.sql?')
      }
      return onSaved()
    }

    if (!file) return setError('Velg en fil først.')
    setBusy(true)

    // Same storage layout as insurance files: <user id>/<random id>.<ext> in the private bucket.
    const ext = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : 'bin'
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`
    const { error: uploadError } = await supabase.storage.from(POLICY_BUCKET).upload(path, file, { contentType: file.type })
    if (uploadError) {
      console.error(uploadError)
      setBusy(false)
      return setError('Kunne ikke laste opp filen. Prøv igjen.')
    }

    const { error: insertError } = await supabase.from('documents').insert({
      ...documentFields(values, withoutExtension(file.name)),
      file_path: path,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      consent_at: new Date().toISOString(),
      consent_version: LEGAL_VERSION,
    })
    if (insertError) {
      console.error(insertError)
      await supabase.storage.from(POLICY_BUCKET).remove([path]) // don't leave an orphaned file behind
      setBusy(false)
      return setError('Kunne ikke lagre dokumentet. Har du kjørt supabase/payers-documents-providers.sql?')
    }
    setBusy(false)
    onSaved()
  }

  return (
    <Modal show onHide={busy ? undefined : onClose} centered>
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton={!busy}>
          <Modal.Title as="h2" className="modal-title-sm">
            {editing ? 'Rediger dokument' : 'Legg til dokument'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}

          {!editing && (
            <Form.Group className="mb-3" controlId="doc-file">
              <Form.Label>Fil (PDF, JPG eller PNG, maks {formatBytes(MAX_FILE_BYTES)})</Form.Label>
              <Form.Control ref={fileInput} type="file" accept={FILE_ACCEPT} onChange={handleFile} required />
            </Form.Group>
          )}

          <Form.Group className="mb-3" controlId="doc-title">
            <Form.Label>Tittel</Form.Label>
            <Form.Control
              type="text"
              placeholder="F.eks. Vedtekter for sameiet"
              value={values.title}
              onChange={(e) => patch({ title: e.target.value })}
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="doc-category">
            <Form.Label>Kategori</Form.Label>
            <Form.Select value={values.category} onChange={(e) => patch({ category: e.target.value })}>
              {documentCategories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3" controlId="doc-date">
            <Form.Label>Dato (valgfritt)</Form.Label>
            <Form.Control type="date" value={values.docDate} onChange={(e) => patch({ docDate: e.target.value })} />
            <Form.Text muted>For eksempel når vedtektene sist ble endret.</Form.Text>
          </Form.Group>

          <Form.Group className="mb-3" controlId="doc-notes">
            <Form.Label>Notater (valgfritt)</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              placeholder="F.eks. §5 sier hvem som har ansvar for bygningsforsikringen"
              value={values.notes}
              onChange={(e) => patch({ notes: e.target.value })}
            />
          </Form.Group>

          {!editing && (
            <Form.Check
              id="doc-consent"
              type="checkbox"
              className="consent-box"
              required
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              label={
                <>
                  Dokumentet kan inneholde personopplysninger. Jeg samtykker til at Dekket lagrer det for meg.
                  Jeg kan trekke samtykket når som helst ved å slette dokumentet eller kontoen. Se{' '}
                  <Link to="/personvern" target="_blank">
                    personvernerklæringen
                  </Link>
                  .
                </>
              }
            />
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={onClose} disabled={busy}>
            Avbryt
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? (editing ? 'Lagrer …' : 'Laster opp …') : editing ? 'Lagre' : 'Last opp'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}
