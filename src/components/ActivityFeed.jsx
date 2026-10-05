import { docKindLabel, holderLabel, insuranceTypeLabel, payerLabel } from '../content/insuranceTypes'
import { formatDate, formatDateTime, formatMoney } from '../lib/format'
import { frequencyLabel } from '../lib/payments'

const FIELD_LABEL = {
  title: 'Navn',
  insurance_type: 'Type',
  insurer: 'Selskap',
  holder: 'Tegnet via',
  payer: 'Betaler',
  doc_kind: 'Dokumenttype',
  valid_from: 'Gyldig fra',
  valid_to: 'Gyldig til',
  auto_renews: 'Fornyes automatisk',
  annual_premium: 'Pris per år',
  payment_frequency: 'Hvor ofte betalt',
  payment_anchor: 'Betalingsdato',
  fee_per_payment: 'Gebyr per faktura',
}

function showValue(key, value) {
  if (value === null || value === '') return 'ingen'
  if (key === 'insurance_type') return insuranceTypeLabel(value)
  if (key === 'holder') return holderLabel(value)
  if (key === 'payer') return payerLabel(value)
  if (key === 'doc_kind') return docKindLabel(value)
  if (key === 'auto_renews') return value ? 'ja' : 'nei'
  if (key === 'payment_frequency') return frequencyLabel(value)
  if (key === 'valid_from' || key === 'valid_to' || key === 'payment_anchor') return formatDate(value)
  if (key === 'annual_premium' || key === 'fee_per_payment') return formatMoney(value)
  return String(value)
}

const EVENT = {
  added: { icon: 'plus-circle', verb: 'Lagt til' },
  updated: { icon: 'pencil', verb: 'Endret' },
  deleted: { icon: 'trash', verb: 'Slettet' },
}

// The newest entries of the activity log. `events` are rows from `policy_events`.
export default function ActivityFeed({ events, failed }) {
  if (failed) {
    return (
      <p className="lp-muted mb-0">
        Aktivitetsloggen er ikke satt opp ennå. Kjør supabase/dashboard.sql i Supabase.
      </p>
    )
  }
  if (events.length === 0) return <p className="lp-muted mb-0">Ingen aktivitet ennå.</p>

  return (
    <ul className="rows">
      {events.map((e) => {
        const { icon, verb } = EVENT[e.event] ?? EVENT.updated
        const changes = e.event === 'updated' && e.changes ? Object.entries(e.changes) : []
        return (
          <li key={e.id} className="rows-item rows-item--top">
            <span className="icon-circle icon-circle--sm">
              <i className={`bi bi-${icon}`} aria-hidden="true" />
            </span>
            <div className="rows-main">
              <div className="rows-title">
                {verb}: {e.title}
              </div>
              {changes.map(([key, [before, after]]) => (
                <div key={key} className="rows-note">
                  {FIELD_LABEL[key] ?? key}: {showValue(key, before)} → {showValue(key, after)}
                </div>
              ))}
              <div className="rows-note">{formatDateTime(e.created_at)}</div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
