import { useState } from 'react'
import { Alert, Button, Col, Form, Modal, Row } from 'react-bootstrap'
import { emptyProvider, providerValues, validateProvider } from '../lib/providerFields'
import { LOGO_BUCKET } from '../lib/policyActions'
import { resizeLogo } from '../lib/resizeLogo'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from './AuthProvider'
import ProviderLogo from './ProviderLogo'

const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const MAX_LOGO_BYTES = 5 * 1024 * 1024 // the picture is shrunk before upload, so the original may be fairly large

// Dialog for adding or editing an insurance provider.
// `provider` = the row to edit, or null to add. `prefillName` pre-fills the name (from the suggestion chips).
// Mount it only while open (<ProviderModal key=… />) so it starts fresh each time.
export default function ProviderModal({ provider, logoUrl, prefillName = '', onClose, onSaved }) {
  const { user } = useAuth()
  const editing = Boolean(provider)
  const [values, setValues] = useState(() => (provider ? providerValues(provider) : { ...emptyProvider, name: prefillName }))
  const [logoFile, setLogoFile] = useState(null)
  const [removeLogo, setRemoveLogo] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const patch = (changes) => setValues((v) => ({ ...v, ...changes }))
  const text = (key, label, props = {}) => (
    <Form.Group className="mb-3" controlId={`prov-${key}`}>
      <Form.Label>{label}</Form.Label>
      <Form.Control value={values[key]} onChange={(e) => patch({ [key]: e.target.value })} {...props} />
    </Form.Group>
  )

  function handleLogo(e) {
    const picked = e.target.files[0] ?? null
    setError('')
    if (picked && !LOGO_TYPES.includes(picked.type)) {
      setError('Logoen må være PNG, JPG eller WebP.')
      e.target.value = ''
      return setLogoFile(null)
    }
    if (picked && picked.size > MAX_LOGO_BYTES) {
      setError('Bildet er for stort. Velg et under 5 MB.')
      e.target.value = ''
      return setLogoFile(null)
    }
    setLogoFile(picked)
    setRemoveLogo(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const checked = validateProvider(values)
    if (checked.error) return setError(checked.error)

    setBusy(true)
    let logoPath = provider?.logo_path ?? null
    let uploadedPath = null

    if (logoFile) {
      const blob = await resizeLogo(logoFile)
      if (!blob) {
        setBusy(false)
        return setError('Kunne ikke lese bildet. Prøv et annet.')
      }
      uploadedPath = `${user.id}/${crypto.randomUUID()}.png`
      const { error: uploadError } = await supabase.storage
        .from(LOGO_BUCKET)
        .upload(uploadedPath, blob, { contentType: 'image/png' })
      if (uploadError) {
        console.error(uploadError)
        setBusy(false)
        return setError('Kunne ikke laste opp logoen. Har du kjørt supabase/payers-documents-providers.sql?')
      }
      logoPath = uploadedPath
    } else if (removeLogo) {
      logoPath = null
    }

    const payload = { ...checked.fields, logo_path: logoPath }
    const { error: saveError } = editing
      ? await supabase.from('providers').update(payload).eq('id', provider.id)
      : await supabase.from('providers').insert(payload)

    if (saveError) {
      console.error(saveError)
      if (uploadedPath) await supabase.storage.from(LOGO_BUCKET).remove([uploadedPath])
      setBusy(false)
      return setError('Kunne ikke lagre. Har du kjørt supabase/payers-documents-providers.sql?')
    }

    // The old logo is no longer used — remove it (best effort).
    if (provider?.logo_path && provider.logo_path !== logoPath) {
      await supabase.storage.from(LOGO_BUCKET).remove([provider.logo_path])
    }
    setBusy(false)
    onSaved()
  }

  const showCurrentLogo = editing && provider.logo_path && !removeLogo && !logoFile

  return (
    <Modal show onHide={busy ? undefined : onClose} centered scrollable>
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton={!busy}>
          <Modal.Title as="h2" className="modal-title-sm">
            {editing ? 'Rediger selskap' : 'Legg til selskap'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}

          {text('name', 'Navn', { placeholder: 'F.eks. If, Gjensidige, KLP', required: true })}

          <div className="logo-field mb-3">
            <ProviderLogo name={values.name} url={showCurrentLogo ? logoUrl : null} size={56} />
            <div>
              <Form.Label htmlFor="prov-logo" className="mb-1">
                Logo (valgfritt)
              </Form.Label>
              <Form.Control id="prov-logo" type="file" accept={LOGO_TYPES.join(',')} onChange={handleLogo} size="sm" />
              {showCurrentLogo && (
                <button type="button" className="link-button small mt-1" onClick={() => setRemoveLogo(true)}>
                  Fjern logoen
                </button>
              )}
            </div>
          </div>

          <Row>
            <Col sm={6}>{text('websiteUrl', 'Nettside', { placeholder: 'if.no', inputMode: 'url' })}</Col>
            <Col sm={6}>{text('claimsUrl', 'Meld skade (lenke)', { placeholder: 'if.no/skade', inputMode: 'url' })}</Col>
          </Row>
          <Row>
            <Col sm={6}>{text('phone', 'Telefon, kundeservice', { inputMode: 'tel' })}</Col>
            <Col sm={6}>{text('claimsPhone', 'Telefon, skade', { inputMode: 'tel' })}</Col>
          </Row>
          {text('email', 'E-post', { type: 'email' })}
          {text('address', 'Adresse', { as: 'textarea', rows: 2 })}
          {text('customerNumber', 'Kundenummer (valgfritt)')}
          {text('notes', 'Notater (valgfritt)', {
            as: 'textarea',
            rows: 2,
            placeholder: 'F.eks. husk polisenummer når du ringer',
          })}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={onClose} disabled={busy}>
            Avbryt
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? 'Lagrer …' : 'Lagre'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}
