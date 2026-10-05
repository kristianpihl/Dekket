import { useState } from 'react'
import { Alert, Button, Table } from 'react-bootstrap'
import DocumentModal from '../components/DocumentModal'
import { documentCategoryLabel } from '../content/insuranceTypes'
import { deleteDocument } from '../lib/documentActions'
import { formatBytes, formatDate } from '../lib/format'
import { openPolicyFile } from '../lib/policyActions'
import { useDocuments } from '../lib/useDocuments'

// "Andre dokumenter" — files that matter for your insurance but aren't insurance policies themselves,
// such as the housing association's bylaws. Insurance policies live under "Mine forsikringer".
export default function Documents() {
  const { documents, loading, error: loadError, reload } = useDocuments()
  const [modal, setModal] = useState(null) // null | 'add' | a document row (edit)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  async function handleOpen(doc) {
    setError('')
    setError(await openPolicyFile(doc))
  }

  async function handleDelete(doc) {
    if (!window.confirm(`Slette «${doc.title}»? Filen fjernes for godt.`)) return
    setError('')
    setBusyId(doc.id)
    const message = await deleteDocument(doc)
    setBusyId(null)
    setError(message)
    if (!message) reload()
  }

  return (
    <div>
      <div className="page-head">
        <h1>Andre dokumenter</h1>
        <Button onClick={() => setModal('add')}>
          <i className="bi bi-plus-lg me-2" aria-hidden="true" />
          Legg til
        </Button>
      </div>
      <p className="lp-muted">
        Dokumenter som hører med til forsikringene dine uten å være forsikringer selv, for eksempel vedtektene til
        sameiet eller borettslaget. Der står det ofte hvem som har ansvar for hva.
      </p>

      {loadError && <Alert variant="warning">{loadError}</Alert>}
      {error && <Alert variant="danger">{error}</Alert>}

      {loading ? (
        <p>Laster …</p>
      ) : documents.length === 0 ? (
        <div className="card-box empty">
          <span className="icon-circle icon-circle--lg">
            <i className="bi bi-folder2-open" aria-hidden="true" />
          </span>
          <h2>Ingen dokumenter ennå</h2>
          <p className="text-muted">Legg til vedtektene til sameiet, så har du dem samlet med forsikringene.</p>
          <Button onClick={() => setModal('add')}>Legg til dokument</Button>
        </div>
      ) : (
        <div className="card-box table-card">
          <Table responsive hover className="policy-table align-middle mb-0">
            <thead>
              <tr>
                <th>Tittel</th>
                <th className="d-none d-sm-table-cell">Kategori</th>
                <th className="d-none d-md-table-cell">Dato</th>
                <th className="d-none d-lg-table-cell">Lagt til</th>
                <th aria-label="Handlinger" />
              </tr>
            </thead>
            <tbody>
              {documents.map((d) => (
                <tr key={d.id}>
                  <td>
                    <div className="fw-medium">{d.title}</div>
                    <div className="policy-meta">
                      {d.file_name} ({formatBytes(d.file_size)})
                    </div>
                    {d.notes && <div className="doc-notes">{d.notes}</div>}
                  </td>
                  <td className="d-none d-sm-table-cell">{documentCategoryLabel(d.category)}</td>
                  <td className="d-none d-md-table-cell">{d.doc_date ? formatDate(d.doc_date) : <span className="text-muted">–</span>}</td>
                  <td className="d-none d-lg-table-cell">{formatDate(d.created_at)}</td>
                  <td className="text-end text-nowrap">
                    <Button size="sm" variant="outline-primary" onClick={() => handleOpen(d)}>
                      Åpne
                    </Button>{' '}
                    <Button size="sm" variant="outline-primary" onClick={() => setModal(d)}>
                      Rediger
                    </Button>{' '}
                    <Button size="sm" variant="outline-danger" disabled={busyId === d.id} onClick={() => handleDelete(d)}>
                      Slett
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      {modal && (
        <DocumentModal
          key={modal === 'add' ? 'add' : modal.id}
          document={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null)
            reload()
          }}
        />
      )}
    </div>
  )
}
