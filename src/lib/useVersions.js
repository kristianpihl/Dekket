import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from './supabaseClient'

// Loads the user's archived older versions of policy documents (RLS returns only their own).
// Returns { versions, byPolicy, loading, error, reload } — `byPolicy` maps policy id → its archived versions.
// If the table doesn't exist yet (SQL not run) it quietly returns an empty list: versions simply aren't available.
export function useVersions() {
  const [state, setState] = useState({ versions: [], loading: true, error: false })

  const reload = useCallback(async () => {
    const { data, error } = await supabase.from('policy_versions').select('*').order('created_at', { ascending: false })
    if (error) console.warn('versions unavailable:', error.message)
    setState({ versions: data ?? [], loading: false, error: Boolean(error) })
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const byPolicy = useMemo(() => {
    const map = new Map()
    for (const v of state.versions) {
      if (!map.has(v.policy_id)) map.set(v.policy_id, [])
      map.get(v.policy_id).push(v)
    }
    return map
  }, [state.versions])

  return { ...state, byPolicy, reload }
}
