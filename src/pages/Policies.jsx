import { useState } from 'react'
import { Alert, Button, Table } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { insuranceTypeLabel } from '../content/insuranceTypes'
import { formatBytes, formatDate } from '../lib/format'
import { deletePolicy, openPolicyFile } from '../lib/policyActions'
import { usePolicies } from '../lib/usePolicies'

// "Mine forsikringer" — a table of everything the user has added.
export default function Policies() {
  const { policies, loading, error: loadError, reload } = usePolicies()
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  async function handleOpen(policy) {
    setError('')
    setError(await openPolicyFile(policy))
  }

  async function handleDelete(policy) {
    if (!window.confirm(`Slette «${policy.title}»? Filen fjernes for godt.`)) return
    setError('')
    setBusyId(policy.id)
    const message = await deletePolicy(policy)
    setBusyId(null)
    setError(message)
    if (!message) reload()
  }

  return (
    <div>
      <div className="page-head">
        <h1>Mine forsikringer</h1>
        <Link to="/legg-til" className="btn btn-primary">
          <i className="bi bi-plus-lg me-2" aria-hidden="true" />
          Legg til
        </Link>
      </div>

      {loadError && <Alert variant="warning">{loadError}</Alert>}
      {error && <Alert variant="danger">{error}</Alert>}

      {loading ? (
        <p>Laster …</p>
      ) : policies.length === 0 ? (
        <div className="card-box empty">
          <span className="icon-circle icon-circle--lg">
            <i className="bi bi-folder2-open" aria-hidden="true" />
          </span>
          <h2>Ingen forsikringer ennå</h2>
          <p className="text-muted">Start med å legge til den første.</p>
          <Link to="/legg-til" className="btn btn-primary">
            Legg til forsikring
          </Link>
        </div>
      ) : (
        <div className="card-box table-card">
          <Table responsive hover className="policy-table align-middle mb-0">
            <thead>
              <tr>
                <th>Navn</th>
                <th>Type</th>
                <th className="d-none d-md-table-cell">Selskap</th>
                <th className="d-none d-md-table-cell">Størrelse</th>
                <th className="d-none d-sm-table-cell">Lagt til</th>
                <th aria-label="Handlinger" />
              </tr>
            </thead>
            <tbody>
              {policies.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="fw-medium">{p.title}</div>
                    <div className="policy-meta">{p.file_name}</div>
                  </td>
                  <td>{insuranceTypeLabel(p.insurance_type)}</td>
                  <td className="d-none d-md-table-cell">{p.insurer || '–'}</td>
                  <td className="d-none d-md-table-cell">{formatBytes(p.file_size)}</td>
                  <td className="d-none d-sm-table-cell">{formatDate(p.created_at)}</td>
                  <td className="text-end text-nowrap">
                    <Button size="sm" variant="outline-primary" onClick={() => handleOpen(p)}>
                      Åpne
                    </Button>{' '}
                    <Button
                      size="sm"
                      variant="outline-danger"
                      disabled={busyId === p.id}
                      onClick={() => handleDelete(p)}
                    >
                      Slett
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </div>
  )
}
