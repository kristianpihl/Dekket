import { useCallback, useEffect, useState } from 'react'
import { LOGO_BUCKET } from './policyActions'
import { supabase } from './supabaseClient'

// Loads the user's insurance providers (A–Å) plus short-lived links to their logos.
// The logo bucket is private, so each logo needs a signed link (valid one hour).
// Returns { providers, logoUrls, loading, error, reload } — `logoUrls` maps logo_path → link.
export function useProviders() {
  const [state, setState] = useState({ providers: [], logoUrls: {}, loading: true, error: '' })

  const reload = useCallback(async () => {
    const { data, error } = await supabase.from('providers').select('*').order('name', { ascending: true })
    if (error) {
      console.error(error)
      setState({
        providers: [],
        logoUrls: {},
        loading: false,
        error: 'Kunne ikke hente selskapene. Har du kjørt supabase/payers-documents-providers.sql?',
      })
      return
    }

    const logoUrls = {}
    const paths = data.map((p) => p.logo_path).filter(Boolean)
    if (paths.length > 0) {
      const { data: signed, error: signError } = await supabase.storage.from(LOGO_BUCKET).createSignedUrls(paths, 3600)
      if (signError) console.error(signError)
      for (const item of signed ?? []) if (item.signedUrl) logoUrls[item.path] = item.signedUrl
    }
    setState({ providers: data, logoUrls, loading: false, error: '' })
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return { ...state, reload }
}
