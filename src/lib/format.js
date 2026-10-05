// Small display helpers.

export function formatBytes(bytes) {
  if (bytes == null) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Accepts a full timestamp ("2026-10-05T10:00:00Z") or a plain date ("2026-10-05").
export function formatDate(value) {
  if (!value) return ''
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value)
  return date.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDateTime(iso) {
  return new Date(iso).toLocaleString('nb-NO', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// 1185 → "1 185 kr"
export function formatMoney(amount) {
  if (amount == null) return ''
  return `${Math.round(Number(amount)).toLocaleString('nb-NO')} kr`
}
