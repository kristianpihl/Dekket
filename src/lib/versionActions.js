import { LEGAL_VERSION } from '../content/legal'
import { POLICY_BUCKET } from './policyActions'
import { supabase } from './supabaseClient'

// Uploads a new version of a policy's document and keeps the old one as history.
//   1) the new file goes to storage, in the user's own folder,
//   2) the database function add_policy_version() moves the old file to the history and makes the new one current,
//   3) optionally the policy's price/dates are updated in the same go (`updates`, e.g. { annual_premium: 1290 }).
// Returns an error message, or '' when it worked. Step 3 failing leaves the new version in place (the user can fix
// the numbers with "Rediger"), and says so.
export async function uploadNewVersion({ userId, policy, file, note, updates = {} }) {
  const ext = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : 'bin'
  const path = `${userId}/${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await supabase.storage.from(POLICY_BUCKET).upload(path, file, { contentType: file.type })
  if (uploadError) {
    console.error(uploadError)
    return 'Kunne ikke laste opp filen. Prøv igjen.'
  }

  const { error: rpcError } = await supabase.rpc('add_policy_version', {
    p_policy: policy.id,
    p_path: path,
    p_name: file.name,
    p_size: file.size,
    p_mime: file.type,
    p_note: note ?? '',
    p_consent_version: LEGAL_VERSION,
  })
  if (rpcError) {
    console.error(rpcError)
    await supabase.storage.from(POLICY_BUCKET).remove([path]) // don't leave an orphaned file behind
    return 'Kunne ikke lagre den nye versjonen. Har du kjørt supabase/versions-reminders.sql?'
  }

  if (Object.keys(updates).length > 0) {
    const { error: updateError } = await supabase.from('policies').update(updates).eq('id', policy.id)
    if (updateError) {
      console.error(updateError)
      return 'Den nye versjonen er lagret, men pris og datoer kunne ikke oppdateres. Rett dem under «Rediger».'
    }
  }
  return ''
}

// Deletes an old version: the file first, then the history row. Returns an error message, or ''.
export async function deleteVersion(version) {
  const { error: fileError } = await supabase.storage.from(POLICY_BUCKET).remove([version.file_path])
  if (fileError) {
    console.error(fileError)
    return 'Kunne ikke slette filen. Prøv igjen.'
  }
  const { error: rowError } = await supabase.from('policy_versions').delete().eq('id', version.id)
  if (rowError) {
    console.error(rowError)
    return 'Filen ble slettet, men oppføringen ble igjen. Last siden på nytt og prøv igjen.'
  }
  return ''
}
