// The calculations behind the dashboard. Pure functions: policies in, numbers/lists out —
// no network or screens here, so they are easy to reason about and test.
// A "policy" is a row from the `policies` table (see supabase/*.sql).
// `today` is a parameter (defaulting to now) so the logic can be checked against fixed dates.

import { holderLabel, insuranceTypes } from '../content/insuranceTypes'
import { formatDate } from './format'

const SOON_DAYS = 60 // "forfaller snart" = ends within this many days

// Whole days from today until a "YYYY-MM-DD" date. Negative = in the past. null = no date.
export function daysUntil(dateStr, today = new Date()) {
  if (!dateStr) return null
  const [y, m, d] = dateStr.split('-').map(Number)
  const end = new Date(y, m - 1, d)
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((end - start) / 86400000)
}

// 'expired' | 'soon' | 'no-date' | 'ok'
export function policyStatus(policy, today = new Date()) {
  const days = daysUntil(policy.valid_to, today)
  if (days === null) return 'no-date'
  if (days < 0) return 'expired'
  if (days <= SOON_DAYS) return 'soon'
  return 'ok'
}

const isActive = (policy, today) => policyStatus(policy, today) !== 'expired'

// Which status "wins" for an area when it has several policies:
// one that is running fine beats one about to end, which beats missing dates, which beats expired.
const STATUS_ORDER = ['ok', 'soon', 'no-date', 'expired']

export const AREA_LABEL = {
  ok: 'Registrert',
  soon: 'Forfaller snart',
  'no-date': 'Mangler dato',
  expired: 'Utløpt',
  none: 'Ikke lagt til',
}

// --- Missing documents (needs no AI) -------------------------------------------------------------
// A policy is only fully described by its certificate (forsikringsbevis: your sums, period, price)
// AND its terms (vilkår: what is covered). If the user has uploaded one of them for a type, point out the other.
// We only judge a type when we KNOW what every file for it is: one "unknown" file and we say nothing.
export function missingDocuments(policies) {
  const result = []
  for (const type of insuranceTypes.filter((t) => t.value !== 'other')) {
    const items = policies.filter((p) => p.insurance_type === type.value && p.doc_kind !== 'bylaws' && p.doc_kind !== 'other')
    if (items.length === 0 || items.some((p) => !p.doc_kind || p.doc_kind === 'unknown')) continue

    const hasCertificate = items.some((p) => p.doc_kind === 'certificate' || p.doc_kind === 'both')
    const hasTerms = items.some((p) => p.doc_kind === 'terms' || p.doc_kind === 'both')
    if (hasTerms && !hasCertificate) result.push({ type: type.value, label: type.label, missing: 'certificate' })
    if (hasCertificate && !hasTerms) result.push({ type: type.value, label: type.label, missing: 'terms' })
  }
  return result
}

// --- Coverage areas: one per insurance type (except "other") ---------------------------------

export function buildAreas(policies, today = new Date()) {
  const missing = missingDocuments(policies)
  return insuranceTypes
    .filter((t) => t.value !== 'other')
    .map((type) => {
      const items = policies.filter((p) => p.insurance_type === type.value)
      const base = { id: type.value, name: type.label, icon: type.icon, count: items.length }

      if (items.length === 0) {
        return { ...base, status: 'none', label: AREA_LABEL.none, note: 'Ingen forsikring registrert' }
      }

      const statusOf = (p) => policyStatus(p, today)
      const status = STATUS_ORDER.find((s) => items.some((p) => statusOf(p) === s))
      const rep = items.find((p) => statusOf(p) === status)

      const detail = {
        ok: rep.valid_to ? `gyldig til ${formatDate(rep.valid_to)}` : '',
        soon: `går ut ${formatDate(rep.valid_to)}`,
        expired: `gikk ut ${formatDate(rep.valid_to)}`,
        'no-date': 'sluttdato mangler',
      }[status]

      const note = [rep.insurer, detail].filter(Boolean).join(' · ') + (items.length > 1 ? ` (+${items.length - 1} til)` : '')
      const gap = missing.find((m) => m.type === type.value)
      const extra = gap ? (gap.missing === 'certificate' ? 'Mangler forsikringsbevis' : 'Mangler vilkår') : null
      return { ...base, status, label: AREA_LABEL[status], note, extra }
    })
}

// --- "Må følges opp" ---------------------------------------------------------------------------

export function buildTodos(policies, today = new Date()) {
  if (policies.length === 0) {
    return [
      {
        id: 'first',
        icon: 'plus-circle',
        title: 'Legg til din første forsikring',
        note: 'Start med den du har for hånden. Det tar et minutt.',
        action: { label: 'Legg til', to: '/legg-til' },
      },
    ]
  }

  const byEnd = (a, b) => (a.valid_to ?? '').localeCompare(b.valid_to ?? '')
  const todos = []

  // Expired — unless the same type has another policy that is still running (assume it was replaced).
  const runningTypes = new Set(policies.filter((p) => isActive(p, today) && p.valid_to).map((p) => p.insurance_type))
  policies
    .filter((p) => policyStatus(p, today) === 'expired' && !runningTypes.has(p.insurance_type))
    .sort(byEnd)
    .forEach((p) =>
      todos.push({
        id: `expired-${p.id}`,
        icon: 'calendar-x',
        title: `«${p.title}» har gått ut`,
        note: `Gyldig til ${formatDate(p.valid_to)}. Er den fornyet? Oppdater datoen eller last opp den nye.`,
        action: { label: 'Oppdater', to: `/forsikringer?rediger=${p.id}` },
      }),
    )

  policies
    .filter((p) => policyStatus(p, today) === 'soon')
    .sort(byEnd)
    .forEach((p) => {
      const days = daysUntil(p.valid_to, today)
      todos.push({
        id: `soon-${p.id}`,
        icon: 'calendar-event',
        title: days === 0 ? `«${p.title}» går ut i dag` : `«${p.title}» går ut om ${days} ${days === 1 ? 'dag' : 'dager'}`,
        note: `Sjekk at den fornyes, og at den fortsatt passer for deg.`,
        action: { label: 'Se', to: `/forsikringer?rediger=${p.id}` },
      })
    })

  missingDocuments(policies).forEach((m) => {
    const area = m.label.toLowerCase()
    todos.push(
      m.missing === 'certificate'
        ? {
            id: `doc-certificate-${m.type}`,
            icon: 'file-earmark-plus',
            title: `Legg til forsikringsbeviset for ${area}`,
            note: 'Vilkårene sier hva som kan dekkes, men det er beviset som viser hva du faktisk har.',
            action: { label: 'Legg til', to: '/legg-til' },
          }
        : {
            id: `doc-terms-${m.type}`,
            icon: 'file-earmark-plus',
            title: `Legg til vilkårene for ${area}`,
            note: 'Beviset viser summer og pris, men vilkårene forklarer hva som er dekket og ikke.',
            action: { label: 'Legg til', to: '/legg-til' },
          },
    )
  })

  const noDate = policies.filter((p) => policyStatus(p, today) === 'no-date')
  if (noDate.length > 0) {
    todos.push({
      id: 'no-date',
      icon: 'calendar-check',
      title: noDate.length === 1 ? `«${noDate[0].title}» mangler sluttdato` : `${noDate.length} forsikringer mangler sluttdato`,
      note: 'Med en dato kan Dekket varsle deg før noe går ut.',
      action: { label: 'Legg inn', to: noDate.length === 1 ? `/forsikringer?rediger=${noDate[0].id}` : '/forsikringer' },
    })
  }

  return todos.slice(0, 5)
}

// How many things need the user's attention (used for the number at the top).
export function attentionCount(policies, today = new Date()) {
  return buildAreas(policies, today).filter((a) => ['soon', 'expired', 'no-date'].includes(a.status) || a.extra).length
}

// --- Renewals: policies with an end date, soonest first --------------------------------------

export function upcomingRenewals(policies, today = new Date(), limit = 6) {
  return policies
    .filter((p) => p.valid_to)
    .map((p) => ({ policy: p, days: daysUntil(p.valid_to, today), status: policyStatus(p, today) }))
    .filter((r) => r.days >= -365) // don't list things that ended more than a year ago
    .sort((a, b) => a.days - b.days)
    .slice(0, limit)
}

// --- Cost -------------------------------------------------------------------------------------

export function costSummary(policies, today = new Date()) {
  const active = policies.filter((p) => isActive(p, today))
  const priced = active.filter((p) => p.annual_premium != null)
  const year = priced.reduce((sum, p) => sum + Number(p.annual_premium), 0)

  const byType = new Map()
  priced.forEach((p) => {
    const cur = byType.get(p.insurance_type) ?? { type: p.insurance_type, year: 0, count: 0 }
    cur.year += Number(p.annual_premium)
    cur.count += 1
    byType.set(p.insurance_type, cur)
  })

  const byArea = [...byType.values()]
    .map((row) => {
      const t = insuranceTypes.find((x) => x.value === row.type) ?? insuranceTypes.at(-1)
      return { ...row, label: t.label, icon: t.icon }
    })
    .sort((a, b) => b.year - a.year)

  return {
    year,
    month: year / 12,
    byArea,
    pricedCount: priced.length,
    missingPrice: active.length - priced.length,
  }
}

// --- Who holds the policies (job, housing association, spouse …) ---------------------------

export function holderBreakdown(policies, today = new Date()) {
  const map = new Map()
  policies
    .filter((p) => isActive(p, today))
    .forEach((p) => {
      const cur = map.get(p.holder) ?? { holder: p.holder, label: holderLabel(p.holder), count: 0, year: 0 }
      cur.count += 1
      cur.year += Number(p.annual_premium ?? 0)
      map.set(p.holder, cur)
    })
  return [...map.values()].sort((a, b) => b.count - a.count)
}
