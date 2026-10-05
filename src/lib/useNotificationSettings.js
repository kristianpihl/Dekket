import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

// The e-mail reminder settings of the logged-in user: { email_reminders, lead_days }.
// A user who has never saved anything simply gets the defaults (reminders OFF, 30 and 7 days before).
// Returns { settings, loading, error, saving, save(patch) } — save() writes the change straight away.
const DEFAULTS = { email_reminders: false, lead_days: [30, 7] }

export function useNotificationSettings() {
  const [settings, setSettings] = useState(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    supabase
      .from('notification_settings')
      .select('email_reminders, lead_days')
      .maybeSingle()
      .then(({ data, error: loadError }) => {
        if (cancelled) return
        if (loadError) {
          console.error(loadError)
          setError('Kunne ikke hente innstillingene. Har du kjørt supabase/versions-reminders.sql?')
        } else if (data) {
          setSettings({ email_reminders: data.email_reminders, lead_days: data.lead_days })
        }
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const save = useCallback(
    async (patch) => {
      const next = { ...settings, ...patch }
      setSettings(next) // show the change right away
      setSaving(true)
      setError('')
      const { error: saveError } = await supabase
        .from('notification_settings')
        .upsert({ ...next, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      setSaving(false)
      if (saveError) {
        console.error(saveError)
        setSettings(settings) // put it back
        setError('Kunne ikke lagre innstillingen. Prøv igjen.')
      }
    },
    [settings],
  )

  return { settings, loading, saving, error, save }
}
