import { useState } from 'react'
import { Alert, Button, Table } from 'react-bootstrap'
import { Link, useSearchParams } from 'react-router-dom'
import EditPolicyModal from '../components/EditPolicyModal'
import EndDateCell from '../components/EndDateCell'
import VersionsModal from '../components/VersionsModal'
import { docKindLabel, holderLabel, insuranceTypeLabel, payerLabel } from '../content/insuranceTypes'
import { formatMoney } from '../lib/format'
import { features } from '../content/site'
import { deletePolicy, openPolicyFile } from '../lib/policyActions'
import { usePolicies } from '../lib/usePolicies'
import { useVersions } from '../lib/useVersions'

// "Mine forsikringer" — a table of everything the user has added.
// The edit dialog is driven by the URL (?rediger=<id>) so the dashboard can link straight to it.
export default function Policies() {
  const { policies, loading, error: loadError, reload } = usePolicies()
  const [searchParams, setSearchParams] = useSearchParams()
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const { byPolicy, reload: reloadVersions } = useVersions()
  const [versionsForId, setVersionsForId] = useState(null) // the policy whose version history is open

  const editing = policies.find((p) => p.id === searchParams.get('rediger')) ?? null
  const versionsPolicy = policies.find((p) => p.id === versionsForId) ?? null

  async function handleOpen(policy) {
    setError('')
    setError(await openPolicyFile(policy))
  }

  async function handleDelete(policy) {
    if (!window.confirm(`Slette «${policy.title}»? Filen fjernes for godt.`)) return
    setError('')
    setBusyId(policy.id)
    const message = await deletePolicy(policy, byPolicy.get(policy.id) ?? [])
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
                <th className="d-none d-sm-table-cell">Type</th>
                <th className="d-none d-lg-table-cell">Tegnet via</th>
                <th className="d-none d-md-table-cell">Betaler</th>
                <th>Gyldig til / fornyes</th>
                <th className="d-none d-md-table-cell text-end">Pris per år</th>
                <th aria-label="Handlinger" />
              </tr>
            </thead>
            <tbody>
              {policies.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="fw-medium">{p.title}</div>
                    <div className="policy-meta">
                      {docKindLabel(p.doc_kind)}
                      {p.insurer ? ` · ${p.insurer}` : ''} · {p.file_name}
                    </div>
                    <div className="policy-meta d-md-none">Betaler: {payerLabel(p.payer ?? 'private')}</div>
                  </td>
                  <td className="d-none d-sm-table-cell">{insuranceTypeLabel(p.insurance_type)}</td>
                  <td className="d-none d-lg-table-cell">{holderLabel(p.holder)}</td>
                  <td className="d-none d-md-table-cell">
                    {p.payer && p.payer !== 'private' ? (
                      <span className="pill pill--ok">{payerLabel(p.payer)}</span>
                    ) : (
                      payerLabel(p.payer ?? 'private')
                    )}
                  </td>
                  <td>
                    <EndDateCell policy={p} />
                  </td>
                  <td className="d-none d-md-table-cell text-end">
                    {p.annual_premium != null ? formatMoney(p.annual_premium) : <span className="text-muted">–</span>}
                  </td>
                  <td className="text-end text-nowrap">
                    <Button size="sm" variant="outline-primary" onClick={() => handleOpen(p)}>
                      Åpne
                    </Button>{' '}
                    {features.analysis && (
                      <>
                        <Link to={`/analyse/${p.id}`} className="btn btn-sm btn-outline-primary">
                          Analyse
                        </Link>{' '}
                      </>
                    )}
                    <Button size="sm" variant="outline-primary" onClick={() => setSearchParams({ rediger: p.id })}>
                      Rediger
                    </Button>{' '}
                    <Button size="sm" variant="outline-primary" onClick={() => setVersionsForId(p.id)}>
                      Versjoner{(byPolicy.get(p.id)?.length ?? 0) > 0 ? ` (${byPolicy.get(p.id).length + 1})` : ''}
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

      {versionsPolicy && (
        <VersionsModal
          key={versionsPolicy.id}
          policy={versionsPolicy}
          versions={byPolicy.get(versionsPolicy.id) ?? []}
          onClose={() => setVersionsForId(null)}
          onChanged={() => {
            reload()
            reloadVersions()
          }}
        />
      )}

      {editing && (
        <EditPolicyModal
          key={editing.id}
          policy={editing}
          onClose={() => setSearchParams({})}
          onSaved={() => {
            setSearchParams({})
            reload()
          }}
        />
      )}
    </div>
  )
}
