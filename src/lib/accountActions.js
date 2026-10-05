import { LOGO_BUCKET, POLICY_BUCKET } from './policyActions'
import { supabase } from './supabaseClient'

// Removes every file in the user's own folder (<user id>/) in one storage bucket, in batches.
// Returns an error message, or '' when the folder is empty at the end.
async function emptyUserFolder(bucket, userId) {
  for (;;) {
    const { data: files, error: listError } = await supabase.storage.from(bucket).list(userId, { limit: 100 })
    if (listError) {
      console.error(listError)
      return 'Kunne ikke hente filene dine. Prøv igjen.'
    }
    if (!files || files.length === 0) return ''

    const { data: removed, error: removeError } = await supabase.storage
      .from(bucket)
      .remove(files.map((f) => `${userId}/${f.name}`))
    // The storage API reports "nothing removed" with an empty list, not an error — treat that as a failure
    // so we never loop forever.
    if (removeError || !removed || removed.length === 0) {
      console.error(removeError)
      return 'Kunne ikke slette filene dine. Prøv igjen.'
    }
  }
}

// Deletes the logged-in user's account for good:
//   1) every file they have: documents (insurance + other) and provider logos,
//   2) the account itself (the database function delete_my_account — see supabase/account.sql),
//      which also removes their rows in policies, documents, providers and the activity log.
// Files go first: once the account is gone the user can no longer reach their files.
// Returns an error message, or '' when it worked. The caller signs the user out afterwards.
export async function deleteMyAccount(userId) {
  for (const bucket of [POLICY_BUCKET, LOGO_BUCKET]) {
    const message = await emptyUserFolder(bucket, userId)
    if (message) return message
  }

  const { error: accountError } = await supabase.rpc('delete_my_account')
  if (accountError) {
    console.error(accountError)
    return 'Kunne ikke slette kontoen. Er databasen satt opp? (Kjør supabase/account.sql.) Prøv igjen, eller kontakt oss.'
  }
  return ''
}
