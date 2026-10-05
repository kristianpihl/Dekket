import { supabase } from './supabaseClient'

// Name of the private storage bucket (created in supabase/documents.sql).
export const POLICY_BUCKET = 'policies'

// The bucket is private, so the browser can't link to a file directly.
// We ask Supabase for a temporary link (valid 60 seconds) and open that.
// Returns an error message, or '' when it worked.
export async function openPolicyFile(policy) {
  // Open the tab right away (inside the click) so popup blockers allow it.
  const tab = window.open('', '_blank')
  const { data, error } = await supabase.storage
    .from(POLICY_BUCKET)
    .createSignedUrl(policy.file_path, 60)

  if (error || !data) {
    tab?.close()
    console.error(error)
    return 'Kunne ikke åpne filen. Prøv igjen.'
  }
  if (tab) tab.location.href = data.signedUrl
  return ''
}

// Removes the file first, then the database row (so we never keep a row pointing at nothing).
// Returns an error message, or '' when it worked.
export async function deletePolicy(policy) {
  const { error: fileError } = await supabase.storage.from(POLICY_BUCKET).remove([policy.file_path])
  if (fileError) {
    console.error(fileError)
    return 'Kunne ikke slette filen. Prøv igjen.'
  }
  const { error: rowError } = await supabase.from('policies').delete().eq('id', policy.id)
  if (rowError) {
    console.error(rowError)
    return 'Filen ble slettet, men oppføringen ble igjen. Last siden på nytt og prøv igjen.'
  }
  return ''
}
