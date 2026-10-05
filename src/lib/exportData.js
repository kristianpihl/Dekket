import { zipSync } from 'fflate'
import { buildArchiveFiles } from './exportFormat'
import { POLICY_BUCKET } from './policyActions'
import { supabase } from './supabaseClient'

// Reads a whole table the user owns. Used for tables that may not exist yet (activity log, analyses):
// if the table is missing we simply skip it instead of failing the whole export.
async function readOptional(table) {
  const { data, error } = await supabase.from(table).select('*').order('created_at', { ascending: true })
  if (error) {
    console.warn(`export: skipping ${table}`, error.message)
    return []
  }
  return data
}

// Collects everything the user has in Dekket and packs it into one zip file (built in the browser,
// so nothing is sent anywhere else). `onProgress(text)` is called with a short status line.
// Returns { blob, filename, failed, fileCount }.
export async function exportMyData(user, onProgress = () => {}) {
  onProgress('Henter forsikringene dine …')
  const { data: policies, error } = await supabase
    .from('policies')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw new Error('Kunne ikke hente forsikringene dine.')

  const events = await readOptional('policy_events')
  const analyses = await readOptional('analyses')

  const downloaded = []
  for (let i = 0; i < policies.length; i++) {
    onProgress(`Henter fil ${i + 1} av ${policies.length} …`)
    const policy = policies[i]
    const { data: blob, error: fileError } = await supabase.storage.from(POLICY_BUCKET).download(policy.file_path)
    if (fileError || !blob) console.error('export: file failed', policy.file_path, fileError)
    downloaded.push({ policy, bytes: blob ? new Uint8Array(await blob.arrayBuffer()) : null })
  }

  onProgress('Pakker alt i en zip-fil …')
  const { files, failed } = buildArchiveFiles({ user, policies, events, analyses, downloaded })
  const zipped = zipSync(files, { level: 1 }) // PDFs are already compressed, so a light level is plenty

  const today = new Date().toLocaleDateString('sv-SE') // 2026-10-07
  return {
    blob: new Blob([zipped], { type: 'application/zip' }),
    filename: `dekket-mine-data-${today}.zip`,
    failed,
    fileCount: Object.keys(files).filter((f) => f.startsWith('filer/')).length,
  }
}

// Hands the file to the browser as a normal download.
export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
