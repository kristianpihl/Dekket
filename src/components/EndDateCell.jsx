import { formatDate } from '../lib/format'
import { daysUntil, effectiveEnd, isAutoRenewing, policyStatus } from '../lib/overview'

// The "valid until / renews" cell for a policy. An auto-renewing policy shows its NEXT renewal
// ("Fornyes 1. aug. 2027"); one that doesn't shows when it ends. A small pill appears when it needs attention.
export default function EndDateCell({ policy }) {
  const end = effectiveEnd(policy)
  if (!end) return <span className="text-muted">–</span>

  const status = policyStatus(policy)
  const days = daysUntil(end)
  const renews = isAutoRenewing(policy)

  return (
    <>
      {renews ? 'Fornyes ' : ''}
      {formatDate(end)}
      {status === 'expired' && <span className="pill pill--warn ms-2">Utløpt</span>}
      {status === 'soon' && (
        <span className="pill pill--warn ms-2">
          Om {days} {days === 1 ? 'dag' : 'dager'}
        </span>
      )}
    </>
  )
}
