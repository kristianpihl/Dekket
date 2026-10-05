import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

// Loads the newest entries of the user's activity log (added / changed / deleted policies).
// The log is written automatically by the database (supabase/dashboard.sql); the user can only read it.
// Returns { events, loading, error }. `reloadKey` — change it to fetch again (e.g. after an edit).
export function usePolicyEvents(limit = 8, reloadKey = 0) {
  const [state, setState] = useState({ events: [], loading: true, error: false })

  useEffect(() => {
    let cancelled = false
    supabase
      .from('policy_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) console.error(error)
        setState({ events: data ?? [], loading: false, error: Boolean(error) })
      })
    return () => {
      cancelled = true
    }
  }, [limit, reloadKey])

  return state
}
