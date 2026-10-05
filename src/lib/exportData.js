import { zipSync } from 'fflate'
import { buildArchiveFiles } from './exportFormat'
import { LOGO_BUCKET, POLICY_BUCKET } from './policyActions'
import { supabase } from './supabaseClient'

// Reads a whole table the user owns. Used for tables that may not exist yet (activity log, analyses,
// documents, providers): if the table is missing we simply skip it instead of failing the whole export.
async function readOptional(table) {
  const { data, error } = await supabase.from(table).select('*').order('created_at', { ascending: true })
  if (error) {
    console.warn(`export: skipping ${table}`, error.message)
    return []
  }
  return data
}

// Downloads one file from a storage bucket. Returns its bytes, or null if it could not be fetched.
async function fetchBytes(bucket, path) {
  const { data: blob, error } = await supabase.storage.from(bucket).download(path)
  if (error || !blob) {
    console.error('export: file failed', bucket, path, error)
    return null
  }
  return new Uint8Array(await blob.arrayBuffer())
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
  const documents = await readOptional('documents')
  const providers = await readOptional('providers')

  const total = policies.length + documents.length + providers.filter((p) => p.logo_path).length
  let done = 0
  const step = () => onProgress(`Henter fil ${++done} av ${total} …`)

  const downloaded = []
  for (const policy of policies) {
    step()
    downloaded.push({ policy, bytes: await fetchBytes(POLICY_BUCKET, policy.file_path) })
  }
  const docDownloads = []
  for (const doc of documents) {
    step()
    docDownloads.push({ document: doc, bytes: await fetchBytes(POLICY_BUCKET, doc.file_path) })
  }
  const logoDownloads = []
  for (const provider of providers) {
    if (!provider.logo_path) continue
    step()
    logoDownloads.push({ provider, bytes: await fetchBytes(LOGO_BUCKET, provider.logo_path) })
  }

  onProgress('Pakker alt i en zip-fil …')
  const { files, failed } = buildArchiveFiles({
    user,
    policies,
    events,
    analyses,
    downloaded,
    documents,
    docDownloads,
    providers,
    logoDownloads,
  })
  const zipped = zipSync(files, { level: 1 }) // PDFs are already compressed, so a light level is plenty

  const today = new Date().toLocaleDateString('sv-SE') // 2026-10-07
  return {
    blob: new Blob([zipped], { type: 'application/zip' }),
    filename: `dekket-mine-data-${today}.zip`,
    failed,
    fileCount: Object.keys(files).filter((f) => /^(filer|dokumenter|logoer)\//.test(f)).length,
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
