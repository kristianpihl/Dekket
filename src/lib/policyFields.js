// Shared logic for the policy form fields (used when adding a policy and when editing one).
// In the form, values are kept as plain strings; toDbFields() turns them into database values.

export const emptyValues = {
  title: '',
  type: 'home',
  docKind: '', // must be chosen when adding
  insurer: '',
  holder: 'private',
  payer: 'private',
  validFrom: '',
  validTo: '',
  autoRenews: true, // most policies renew by themselves every year
  premium: '',
  premiumPeriod: 'year', // 'year' | 'month' — what the number in `premium` means
  payFreq: '', // '' = not entered, else monthly | quarterly | semiannual | annual
  payAnchor: '', // one known payment day (the last or the next one)
  fee: '', // invoice/instalment fee per payment, in kr
  nextDate: '', // an announced change: the date it takes effect …
  nextPremium: '', // … the new price …
  nextPremiumPeriod: 'year',
  nextNote: '', // … and a note about it
}

// The database stores the price per year; show it per year when editing.
export function valuesFromPolicy(policy) {
  return {
    title: policy.title ?? '',
    type: policy.insurance_type ?? 'other',
    docKind: policy.doc_kind ?? 'unknown',
    insurer: policy.insurer ?? '',
    holder: policy.holder ?? 'private',
    payer: policy.payer ?? 'private',
    validFrom: policy.valid_from ?? '',
    validTo: policy.valid_to ?? '',
    autoRenews: policy.auto_renews !== false,
    premium: policy.annual_premium != null ? String(policy.annual_premium) : '',
    premiumPeriod: 'year',
    payFreq: policy.payment_frequency ?? '',
    payAnchor: policy.payment_anchor ?? '',
    fee: policy.fee_per_payment != null ? String(policy.fee_per_payment) : '',
    nextDate: policy.next_change_date ?? '',
    nextPremium: policy.next_annual_premium != null ? String(policy.next_annual_premium) : '',
    nextPremiumPeriod: 'year',
    nextNote: policy.next_change_note ?? '',
  }
}

// "1 185,50" / "1185.5" → 1185.5, or null if it isn't a number.
export function parseAmount(text) {
  const cleaned = String(text).replace(/\s/g, '').replace(',', '.')
  if (cleaned === '') return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

// Converts what the user typed ("97,40" per month) to a yearly amount, or null when blank.
function yearly(text, period) {
  if (text.trim() === '') return null
  const amount = parseAmount(text)
  return amount === null ? null : Math.round(amount * (period === 'month' ? 12 : 1) * 100) / 100
}

// Returns an error message, or '' when the values are fine.
export function validateValues(v, { requireKind = false } = {}) {
  if (requireKind && !v.docKind) return 'Velg hva slags dokument dette er.'
  if (v.premium.trim() !== '') {
    const amount = parseAmount(v.premium)
    if (amount === null || amount < 0) return 'Prisen må være et tall som ikke er negativt.'
  }
  if (v.fee.trim() !== '') {
    const fee = parseAmount(v.fee)
    if (fee === null || fee < 0) return 'Gebyret må være et tall som ikke er negativt. Skriv 0 hvis det ikke er noe gebyr.'
  }
  if (v.nextPremium.trim() !== '') {
    const next = parseAmount(v.nextPremium)
    if (next === null || next < 0) return 'Den nye prisen må være et tall som ikke er negativt.'
    if (!v.nextDate) return 'Oppgi datoen den nye prisen gjelder fra.'
  }
  if (v.validFrom && v.validTo && v.validTo < v.validFrom) {
    return 'Sluttdatoen kan ikke være før startdatoen.'
  }
  return ''
}

// "The announced change has taken effect": the new price becomes the price, and the announcement is cleared.
// Returns the form values to merge in.
export function applyAnnouncedChange(v) {
  return {
    premium: v.nextPremium,
    premiumPeriod: v.nextPremiumPeriod,
    nextDate: '',
    nextPremium: '',
    nextPremiumPeriod: 'year',
    nextNote: '',
  }
}

export function toDbFields(v) {
  const fee = v.fee.trim() === '' ? null : parseAmount(v.fee)
  return {
    title: v.title.trim(),
    insurance_type: v.type,
    doc_kind: v.docKind || 'unknown',
    insurer: v.insurer.trim() || null,
    holder: v.holder,
    payer: v.payer,
    valid_from: v.validFrom || null,
    valid_to: v.validTo || null,
    auto_renews: v.autoRenews,
    annual_premium: yearly(v.premium, v.premiumPeriod),
    payment_frequency: v.payFreq || null,
    payment_anchor: v.payAnchor || null,
    fee_per_payment: fee,
    next_change_date: v.nextDate || null,
    next_annual_premium: yearly(v.nextPremium, v.nextPremiumPeriod),
    next_change_note: v.nextNote.trim() || null,
  }
}
