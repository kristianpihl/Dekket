// Shared logic for the policy form fields (used when adding a policy and when editing one).
// In the form, values are kept as plain strings; toDbFields() turns them into database values.

export const emptyValues = {
  title: '',
  type: 'home',
  docKind: '', // must be chosen when adding
  insurer: '',
  holder: 'private',
  validFrom: '',
  validTo: '',
  premium: '',
  premiumPeriod: 'year', // 'year' | 'month' — what the number in `premium` means
}

// The database stores the price per year; show it per year when editing.
export function valuesFromPolicy(policy) {
  return {
    title: policy.title ?? '',
    type: policy.insurance_type ?? 'other',
    docKind: policy.doc_kind ?? 'unknown',
    insurer: policy.insurer ?? '',
    holder: policy.holder ?? 'private',
    validFrom: policy.valid_from ?? '',
    validTo: policy.valid_to ?? '',
    premium: policy.annual_premium != null ? String(policy.annual_premium) : '',
    premiumPeriod: 'year',
  }
}

// "1 185,50" / "1185.5" → 1185.5, or null if it isn't a number.
export function parseAmount(text) {
  const cleaned = String(text).replace(/\s/g, '').replace(',', '.')
  if (cleaned === '') return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

// Returns an error message, or '' when the values are fine.
export function validateValues(v, { requireKind = false } = {}) {
  if (requireKind && !v.docKind) return 'Velg hva slags dokument dette er.'
  if (v.premium.trim() !== '') {
    const amount = parseAmount(v.premium)
    if (amount === null || amount < 0) return 'Prisen må være et tall som ikke er negativt.'
  }
  if (v.validFrom && v.validTo && v.validTo < v.validFrom) {
    return 'Sluttdatoen kan ikke være før startdatoen.'
  }
  return ''
}

export function toDbFields(v) {
  const amount = v.premium.trim() === '' ? null : parseAmount(v.premium)
  const annual = amount === null ? null : Math.round(amount * (v.premiumPeriod === 'month' ? 12 : 1) * 100) / 100
  return {
    title: v.title.trim(),
    insurance_type: v.type,
    doc_kind: v.docKind || 'unknown',
    insurer: v.insurer.trim() || null,
    holder: v.holder,
    valid_from: v.validFrom || null,
    valid_to: v.validTo || null,
    annual_premium: annual,
  }
}
