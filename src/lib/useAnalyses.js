import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from './supabaseClient'

// Loads the user's saved analyses (newest first). RLS returns only their own.
// `latest` maps policy id → its newest analysis. Returns { analyses, latest, loading, error, reload }.
export function useAnalyses() {
  const [analyses, setAnalyses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from('analyses')
      .select('*')
      .order('created_at', { ascending: false })

    if (loadError) {
      console.error(loadError)
      setError('Kunne ikke hente analysene. Har du kjørt supabase/analysis.sql?')
    } else {
      setError('')
      setAnalyses(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const latest = useMemo(() => {
    const map = new Map()
    for (const a of analyses) if (!map.has(a.policy_id)) map.set(a.policy_id, a)
    return map
  }, [analyses])

  return { analyses, latest, loading, error, reload }
}
