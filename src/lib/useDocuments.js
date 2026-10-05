import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

// Loads the user's "other documents" (not insurance), newest first. RLS returns only their own.
// Returns { documents, loading, error, reload }.
export function useDocuments() {
  const [state, setState] = useState({ documents: [], loading: true, error: '' })

  const reload = useCallback(async () => {
    const { data, error } = await supabase.from('documents').select('*').order('created_at', { ascending: false })
    if (error) {
      console.error(error)
      setState({
        documents: [],
        loading: false,
        error: 'Kunne ikke hente dokumentene. Har du kjørt supabase/payers-documents-providers.sql?',
      })
    } else {
      setState({ documents: data, loading: false, error: '' })
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return { ...state, reload }
}
