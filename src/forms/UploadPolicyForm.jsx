import { useRef, useState } from 'react'
import { Alert, Button, Form } from 'react-bootstrap'
import { useAuth } from '../components/AuthProvider'
import { insuranceTypes } from '../content/insuranceTypes'
import { formatBytes } from '../lib/format'
import { supabase } from '../lib/supabaseClient'

const BUCKET = 'policies'
const MAX_BYTES = 10 * 1024 * 1024 // must match the bucket limit in supabase/documents.sql
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']

export default function UploadPolicyForm({ onUploaded }) {
  const { user } = useAuth()
  const fileInput = useRef(null)
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

  async function handleSubmit(e) {
    e.preventDefault()
    if (!file) {
      setError('Velg en fil først.')
      return
    }
    setBusy(true)
    setError('')

    // Files are stored as <user id>/<random id>.<ext> — the folder name is what the
    // storage security rules check, and a random name avoids clashes and odd characters.
    const ext = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : 'bin'
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type })

    if (uploadError) {
      setBusy(false)
      setError('Kunne ikke laste opp filen. Prøv igjen.')
      console.error(uploadError)
      return
    }

    const { error: insertError } = await supabase.from('policies').insert({
      title: title.trim() || file.name,
      insurance_type: type,
      insurer: insurer.trim() || null,
      file_path: path,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
    })

    if (insertError) {
      // Don't leave an orphaned file behind if the database row failed.
      await supabase.storage.from(BUCKET).remove([path])
      setBusy(false)
      setError('Kunne ikke lagre forsikringen. Prøv igjen.')
      console.error(insertError)
      return
    }

    setBusy(false)
    setFile(null)
    setTitle('')
    setInsurer('')
    if (fileInput.current) fileInput.current.value = ''
    onUploaded()
  }

  return (
    <Form onSubmit={handleSubmit} className="upload-form">
      <h2>Last opp forsikring</h2>

      {error && <Alert variant="danger">{error}</Alert>}

      <Form.Group className="mb-3" controlId="policy-file">
        <Form.Label>Fil (PDF, JPG eller PNG, maks {formatBytes(MAX_BYTES)})</Form.Label>
        <Form.Control
          ref={fileInput}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          onChange={handleFileChange}
        />
      </Form.Group>

      <Form.Group className="mb-3" controlId="policy-title">
        <Form.Label>Navn (valgfritt)</Form.Label>
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

      <Form.Group className="mb-3" controlId="policy-insurer">
        <Form.Label>Forsikringsselskap (valgfritt)</Form.Label>
        <Form.Control
          type="text"
          placeholder="F.eks. If, Gjensidige, Tryg"
          value={insurer}
          onChange={(e) => setInsurer(e.target.value)}
        />
      </Form.Group>

      <Button type="submit" disabled={busy || !file}>
        {busy ? 'Laster opp …' : 'Last opp'}
      </Button>
    </Form>
  )
}
