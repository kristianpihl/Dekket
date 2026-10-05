import { useState } from 'react'
import { Alert, Button, Form, Modal } from 'react-bootstrap'
import PolicyFields from '../forms/PolicyFields'
import { toDbFields, validateValues, valuesFromPolicy } from '../lib/policyFields'
import { supabase } from '../lib/supabaseClient'

// Dialog for changing a policy's details (name, type, who holds it, dates, price).
// `policy` is the row being edited; `onSaved` is called after a successful save.
// Mount it only while editing (<EditPolicyModal key={policy.id} … />) so it starts fresh each time.
export default function EditPolicyModal({ policy, onClose, onSaved }) {
  const [values, setValues] = useState(() => valuesFromPolicy(policy))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    const problem = validateValues(values) || (values.title.trim() ? '' : 'Forsikringen må ha et navn.')
    if (problem) {
      setError(problem)
      return
    }
    setBusy(true)
    setError('')
    const { error: saveError } = await supabase
      .from('policies')
      .update(toDbFields(values))
      .eq('id', policy.id)
    setBusy(false)

    if (saveError) {
      console.error(saveError)
      setError('Kunne ikke lagre endringene. Har du kjørt supabase/dashboard.sql? Prøv igjen.')
      return
    }
    onSaved()
  }

  return (
    <Modal show onHide={busy ? undefined : onClose} centered>
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton={!busy}>
          <Modal.Title as="h2" className="modal-title-sm">
            Rediger forsikring
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <PolicyFields
            values={values}
            onChange={(changes) => setValues((v) => ({ ...v, ...changes }))}
            idPrefix="edit"
          />
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
