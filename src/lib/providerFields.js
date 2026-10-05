// Helpers for the "Forsikringsselskaper" page: cleaning up what the user types, so that links and phone
// numbers are safe and actually work.

// "if.no" → "https://if.no". Only http(s) addresses are accepted — anything else (javascript:, data:, …)
// returns null, so a link on the page can never run code. Empty input → '' (field left blank).
export function normalizeUrl(input) {
  const text = String(input ?? '').trim()
  if (text === '') return ''
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`
  try {
    const url = new URL(withScheme)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    if (!url.hostname.includes('.')) return null
    return url.toString()
  } catch {
    return null
  }
}

// "+47 22 12 34 56" → "+4722123456" for tel: links. Keeps digits, plus a + if one comes before the
// first digit (so "Tlf: (+47) 400 00 000" works too).
export function phoneHref(input) {
  const text = String(input ?? '').trim()
  if (text === '') return null
  const digits = text.replace(/[^\d]/g, '')
  if (digits.length < 3) return null
  const plus = text.slice(0, text.search(/\d/)).includes('+') ? '+' : ''
  return `tel:${plus}${digits}`
}

export function normalizeName(name) {
  return String(name ?? '').trim().toLowerCase()
}

// "Gjensidige Forsikring" → "GF", "If" → "I". Shown when a provider has no logo.
export function initials(name) {
  const words = String(name ?? '').trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  const letters = words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[1][0]
  return letters.toUpperCase()
}

export const emptyProvider = {
  name: '',
  websiteUrl: '',
  claimsUrl: '',
  phone: '',
  claimsPhone: '',
  email: '',
  address: '',
  customerNumber: '',
  notes: '',
}

export function providerValues(p) {
  return {
    name: p.name ?? '',
    websiteUrl: p.website_url ?? '',
    claimsUrl: p.claims_url ?? '',
    phone: p.phone ?? '',
    claimsPhone: p.claims_phone ?? '',
    email: p.email ?? '',
    address: p.address ?? '',
    customerNumber: p.customer_number ?? '',
    notes: p.notes ?? '',
  }
}

// Returns { error } with a message for the user, or { fields } ready for the database.
export function validateProvider(v) {
  if (!v.name.trim()) return { error: 'Selskapet må ha et navn.' }

  const websiteUrl = normalizeUrl(v.websiteUrl)
  if (websiteUrl === null) return { error: 'Nettsiden må være en vanlig nettadresse, for eksempel if.no.' }
  const claimsUrl = normalizeUrl(v.claimsUrl)
  if (claimsUrl === null) return { error: 'Lenken for å melde skade må være en vanlig nettadresse.' }

  const email = v.email.trim()
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'E-postadressen ser ikke riktig ut.' }

  return {
    fields: {
      name: v.name.trim(),
      website_url: websiteUrl || null,
      claims_url: claimsUrl || null,
      phone: v.phone.trim() || null,
      claims_phone: v.claimsPhone.trim() || null,
      email: email || null,
      address: v.address.trim() || null,
      customer_number: v.customerNumber.trim() || null,
      notes: v.notes.trim() || null,
    },
  }
}
