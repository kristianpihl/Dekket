import { useRef, useState } from 'react'
import { Alert, Button, Form } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { useAuth } from '../components/AuthProvider'
import { insuranceTypes } from '../content/insuranceTypes'
import { formatBytes } from '../lib/format'
import { POLICY_BUCKET } from '../lib/policyActions'
import { supabase } from '../lib/supabaseClient'

const MAX_BYTES = 10 * 1024 * 1024 // must match the bucket limit in supabase/documents.sql
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const STEPS = ['Velg fil', 'Detaljer', 'Ferdig']

function withoutExtension(name) {
  return name.replace(/\.[^.]+$/, '')
}

// Three-step flow: 1) pick a file, 2) describe it and upload, 3) done.
export default function UploadPolicyForm({ onUploaded }) {
  const { user } = useAuth()
  const fileInput = useRef(null)
  const [step, setStep] = useState(1)
  const [file, setFile] = useState(null)
  const [title, setTitle] = useState('')
  const [type, setType] = useState('home')
  const [insurer, setInsurer] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function handleFileChange(e) {
    const picked = e.target.files[0] ?? null
    setError('')

    if (picked && !ALLOWED_TYPES.includes(picked.type)) {
      setError('Filen må være PDF, JPG eller PNG.')
      e.target.value = ''
      setFile(null)
      return
    }
    if (picked && picked.size > MAX_BYTES) {
      setError(`Filen er for stor (${formatBytes(picked.size)}). Maks ${formatBytes(MAX_BYTES)}.`)
      e.target.value = ''
      setFile(null)
      return
    }
    setFile(picked)
  }

  function goToDetails() {
    if (!file) {
      setError('Velg en fil først.')
      return
    }
    setError('')
    if (!title) setTitle(withoutExtension(file.name))
    setStep(2)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')

    // Files are stored as <user id>/<random id>.<ext> — the folder name is what the
    // storage security rules check, and a random name avoids clashes and odd characters.
    const ext = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : 'bin'
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from(POLICY_BUCKET)
      .upload(path, file, { contentType: file.type })

    if (uploadError) {
      setBusy(false)
      setError('Kunne ikke laste opp filen. Prøv igjen.')
      console.error(uploadError)
      return
    }

    const { error: insertError } = await supabase.from('policies').insert({
      title: title.trim() || withoutExtension(file.name),
      insurance_type: type,
      insurer: insurer.trim() || null,
      file_path: path,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
    })

    if (insertError) {
      // Don't leave an orphaned file behind if the database row failed.
      await supabase.storage.from(POLICY_BUCKET).remove([path])
      setBusy(false)
      setError('Kunne ikke lagre forsikringen. Prøv igjen.')
      console.error(insertError)
      return
    }

    setBusy(false)
    setStep(3)
    onUploaded?.()
  }

  function startOver() {
    setFile(null)
    setTitle('')
    setInsurer('')
    setType('home')
    setError('')
    setStep(1)
  }

  return (
    <div className="upload-flow">
      <ol className="stepper">
        {STEPS.map((label, i) => (
          <li
            key={label}
            className={`stepper-item${step === i + 1 ? ' is-active' : ''}${step > i + 1 ? ' is-done' : ''}`}
          >
            <span className="stepper-dot">
              {step > i + 1 ? <i className="bi bi-check-lg" aria-hidden="true" /> : i + 1}
            </span>
            <span className="stepper-label">{label}</span>
          </li>
        ))}
      </ol>

      {error && <Alert variant="danger">{error}</Alert>}

      {step === 1 && (
        <div>
          <h2>Velg dokumentet</h2>
          <p className="text-muted">
            PDF, JPG eller PNG, maks {formatBytes(MAX_BYTES)}. Det kan være forsikringsbeviset,
            vilkårene eller begge deler.
          </p>
          <Form.Group className="mb-3" controlId="policy-file">
            <Form.Control
              ref={fileInput}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              onChange={handleFileChange}
            />
          </Form.Group>
          {file && (
            <p className="upload-picked">
              <i className="bi bi-file-earmark-text me-2" aria-hidden="true" />
              {file.name} ({formatBytes(file.size)})
            </p>
          )}
          <Button onClick={goToDetails}>Neste</Button>
        </div>
      )}

      {step === 2 && (
        <Form onSubmit={handleSubmit}>
          <h2>Fortell oss litt om den</h2>

          <Form.Group className="mb-3" controlId="policy-title">
            <Form.Label>Navn</Form.Label>
            <Form.Control
              type="text"
              placeholder="F.eks. Innboforsikring 2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="policy-type">
            <Form.Label>Type forsikring</Form.Label>
            <Form.Select value={type} onChange={(e) => setType(e.target.value)}>
              {insuranceTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-4" controlId="policy-insurer">
            <Form.Label>Forsikringsselskap (valgfritt)</Form.Label>
            <Form.Control
              type="text"
              placeholder="F.eks. If, Gjensidige, Tryg"
              value={insurer}
              onChange={(e) => setInsurer(e.target.value)}
            />
          </Form.Group>

          <div className="d-flex gap-2">
            <Button variant="outline-primary" onClick={() => setStep(1)} disabled={busy}>
              Tilbake
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Laster opp …' : 'Last opp'}
            </Button>
          </div>
        </Form>
      )}

      {step === 3 && (
        <div className="upload-done">
          <span className="icon-circle icon-circle--lg">
            <i className="bi bi-check-lg" aria-hidden="true" />
          </span>
          <h2>Forsikringen er lagt til</h2>
          <p className="text-muted">Du finner den i oversikten over alle forsikringene dine.</p>
          <div className="d-flex gap-2 justify-content-center flex-wrap">
            <Button variant="outline-primary" onClick={startOver}>
              Legg til en til
            </Button>
            <Link to="/forsikringer" className="btn btn-primary">
              Se alle forsikringer
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
