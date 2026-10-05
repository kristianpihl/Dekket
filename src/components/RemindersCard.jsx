import { Alert, Form } from 'react-bootstrap'
import { useNotificationSettings } from '../lib/useNotificationSettings'
import { useAuth } from './AuthProvider'

const LEAD_OPTIONS = [
  { days: 30, label: '30 dager før' },
  { days: 14, label: '14 dager før' },
  { days: 7, label: '7 dager før' },
  { days: 1, label: '1 dag før' },
]

// The "Påminnelser" card on the Konto page: switch e-mail reminders on/off and choose how long before.
// Changes are saved straight away. (Shown only when features.reminders is on — see src/content/site.js.)
export default function RemindersCard() {
  const { user } = useAuth()
  const { settings, loading, saving, error, save } = useNotificationSettings()

  function toggleLead(days) {
    const has = settings.lead_days.includes(days)
    if (has && settings.lead_days.length === 1) return // keep at least one
    save({ lead_days: (has ? settings.lead_days.filter((d) => d !== days) : [...settings.lead_days, days]).sort((a, b) => b - a) })
  }

  return (
    <div className="card-box account-block">
      <h2 className="section-title">Påminnelser</h2>
      <p>
        Få en e-post før en forsikring fornyes eller en varslet endring trer i kraft. Den sendes til{' '}
        <strong>{user.email}</strong> og inneholder bare navn, datoer og priser, aldri innholdet i dokumentene.
      </p>

      {error && <Alert variant="danger">{error}</Alert>}

      <Form.Check
        type="switch"
        id="reminders-on"
        className="mb-3"
        disabled={loading || saving}
        checked={settings.email_reminders}
        onChange={(e) => save({ email_reminders: e.target.checked })}
        label="Send meg påminnelser på e-post"
      />

      {settings.email_reminders && (
        <div className="reminder-leads">
          <div className="lp-muted mb-1">Hvor lenge før vil du bli minnet på det?</div>
          {LEAD_OPTIONS.map((option) => (
            <Form.Check
              key={option.days}
              type="checkbox"
              id={`lead-${option.days}`}
              inline
              disabled={saving}
              checked={settings.lead_days.includes(option.days)}
              onChange={() => toggleLead(option.days)}
              label={option.label}
            />
          ))}
          <div className="lp-muted mt-2">Hver påminnelse sendes bare én gang.</div>
        </div>
      )}
    </div>
  )
}
