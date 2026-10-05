// Document versions: turns a policy plus its archived older versions into one list, and works out what
// changed between two versions in the things we KNOW (price, fee, dates, insurer). Pure functions.
// What changed inside the terms themselves can only be read by the analysis (not built yet) — the page says so.

import { formatDate, formatMoney } from './format'

const money = (v) => formatMoney(v)
const date = (v) => formatDate(v)
const text = (v) => String(v)

// Fields compared between versions. Present on both a `policies` row and a `policy_versions` row.
export const VERSION_FIELDS = [
  { key: 'annual_premium', label: 'Pris per år', show: money, numeric: true },
  { key: 'fee_per_payment', label: 'Gebyr per faktura', show: money, numeric: true },
  { key: 'valid_from', label: 'Gyldig fra', show: date },
  { key: 'valid_to', label: 'Gyldig til', show: date },
  { key: 'insurer', label: 'Selskap', show: text },
]

const isBlank = (v) => v === null || v === undefined || v === ''

// What differs from `older` to `newer`: [{ key, label, from, to, delta }]. `from`/`to` are display strings
// ("ingen" when empty); `delta` is the numeric change for money fields (negative = cheaper), else null.
export function versionChanges(older, newer) {
  const changes = []
  for (const field of VERSION_FIELDS) {
    const a = older[field.key]
    const b = newer[field.key]
    if (isBlank(a) && isBlank(b)) continue
    const same = field.numeric && !isBlank(a) && !isBlank(b) ? Number(a) === Number(b) : a === b
    if (same) continue
    changes.push({
      key: field.key,
      label: field.label,
      from: isBlank(a) ? 'ingen' : field.show(a),
      to: isBlank(b) ? 'ingen' : field.show(b),
      delta: field.numeric && !isBlank(a) && !isBlank(b) ? Number(b) - Number(a) : null,
    })
  }
  return changes
}

// One entry per version, newest first. The current file comes first (read from the policy row itself),
// then the archived versions, newest replaced first. Each entry knows its number (the oldest is 1), what
// changed since the version before it (`changes`; null for the very first version), and where to find its file.
export function buildVersionList(policy, archived) {
  const olderFirst = [...archived].sort((a, b) => a.created_at.localeCompare(b.created_at))
  const entries = [
    ...olderFirst.map((v) => ({ id: v.id, current: false, row: v })),
    { id: 'current', current: true, row: policy },
  ]

  return entries
    .map((entry, index) => ({
      id: entry.id,
      current: entry.current,
      number: index + 1,
      fileName: entry.row.file_name,
      fileSize: entry.row.file_size,
      filePath: entry.row.file_path,
      mimeType: entry.row.mime_type,
      addedAt: entry.current ? policy.file_added_at ?? policy.created_at : entry.row.added_at,
      note: entry.current ? policy.version_note ?? null : entry.row.note ?? null,
      changes: index === 0 ? null : versionChanges(entries[index - 1].row, entry.row),
      row: entry.row,
    }))
    .reverse()
}
