import { POLICY_BUCKET } from './policyActions'
import { supabase } from './supabaseClient'

// Removes the file first, then the database row (so we never keep a row pointing at nothing).
// Same idea as deletePolicy() in policyActions.js, but for the `documents` table.
// Returns an error message, or '' when it worked.
export async function deleteDocument(doc) {
  const { error: fileError } = await supabase.storage.from(POLICY_BUCKET).remove([doc.file_path])
  if (fileError) {
    console.error(fileError)
    return 'Kunne ikke slette filen. Prøv igjen.'
  }
  const { error: rowError } = await supabase.from('documents').delete().eq('id', doc.id)
  if (rowError) {
    console.error(rowError)
    return 'Filen ble slettet, men oppføringen ble igjen. Last siden på nytt og prøv igjen.'
  }
  return ''
}
