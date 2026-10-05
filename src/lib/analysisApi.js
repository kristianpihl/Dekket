import { supabase } from './supabaseClient'

// Asks the server (api/analyze.js) to analyse one document. The server needs to know who is asking,
// so we send the user's session token. Returns { analysis } on success or { error } with a message
// that is safe to show to the user.
export async function runAnalysis(policyId) {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return { error: 'Du må være logget inn.' }

  let response
  try {
    response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ policyId }),
    })
  } catch {
    return { error: 'Fikk ikke kontakt med serveren. Sjekk nettforbindelsen og prøv igjen.' }
  }

  let body = null
  try {
    body = await response.json()
  } catch {
    // The server answered with something that isn't JSON (e.g. a gateway timeout page).
  }

  if (!response.ok) {
    if (body?.error) return { error: body.error }
    if (response.status === 504) return { error: 'Analysen tok for lang tid. Prøv igjen, eller bruk et mindre dokument.' }
    if (response.status === 404) return { error: 'Analysen er ikke tilgjengelig her ennå.' }
    return { error: 'Analysen feilet. Prøv igjen.' }
  }
  return { analysis: body.analysis }
}
