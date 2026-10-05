import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

// Loads the logged-in user's uploaded policies (newest first).
// RLS in the database makes sure only the user's own rows come back.
// Returns { policies, loading, error, reload }.
export function usePolicies() {
  const [policies, setPolicies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from('policies')
      .select('*')
      .order('created_at', { ascending: false })

    if (loadError) {
      console.error(loadError)
      setError(
        'Kunne ikke hente forsikringene dine. Er databasen satt opp? (Kjør supabase/documents.sql i Supabase.)',
      )
    } else {
      setError('')
      setPolicies(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return { policies, loading, error, reload }
}
