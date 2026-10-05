// The calculations behind the dashboard. Pure functions: policies in, numbers/lists out —
// no network or screens here, so they are easy to reason about and test.
// A "policy" is a row from the `policies` table (see supabase/*.sql).
// `today` is a parameter (defaulting to now) so the logic can be checked against fixed dates.

import { holderLabel, insuranceTypes } from '../content/insuranceTypes'
import { addYears, monthsBetween, todayIso } from './dates'
import { formatDate } from './format'
import { annualCost, annualFee, feeNeedsFrequency, frequencyOf, installmentAmount, nextPaymentDate } from './payments'

const SOON_DAYS = 60 // "forfaller snart" = ends within this many days

// Whole days from today until a "YYYY-MM-DD" date. Negative = in the past. null = no date.
export function daysUntil(dateStr, today = new Date()) {
  if (!dateStr) return null
  const [y, m, d] = dateStr.split('-').map(Number)
  const end = new Date(y, m - 1, d)
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((end - start) / 86400000)
}

// --- Auto-renewal ---------------------------------------------------------------------------------
// Most policies renew by themselves every year. For those, `valid_to` is the end of the period the
// document describes, and the policy simply carries on: the date that matters is the NEXT renewal,
// i.e. valid_to plus whole years until it is today or later. A rows without the flag counts as
// auto-renewing, like the database default.
export const isAutoRenewing = (policy) => policy.auto_renews !== false

// The date the policy ends, or (if it renews automatically) next renews. null when there is no date.
export function effectiveEnd(policy, today = new Date()) {
  const end = policy.valid_to
  if (!end) return null
  if (!isAutoRenewing(policy)) return end

  const now = todayIso(today)
  if (end >= now) return end

  // Smallest number of whole years that brings the date to today or later. (Always counted from the
  // original date, so 29 Feb returns to 29 Feb in leap years instead of drifting.)
  let years = Math.max(1, Math.floor(monthsBetween(end, now) / 12))
  while (addYears(end, years) < now) years++
  while (years > 1 && addYears(end, years - 1) >= now) years--
  return addYears(end, years)
}

// 'expired' | 'soon' | 'no-date' | 'ok'. An auto-renewing policy is never 'expired' — it renews.
export function policyStatus(policy, today = new Date()) {
  const days = daysUntil(effectiveEnd(policy, today), today)
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
      const end = effectiveEnd(rep, today)
      const renews = isAutoRenewing(rep)

      const detail = {
        ok: end ? `${renews ? 'fornyes' : 'gyldig til'} ${formatDate(end)}` : '',
        soon: `${renews ? 'fornyes' : 'går ut'} ${formatDate(end)}`,
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

  const byEnd = (a, b) => (effectiveEnd(a, today) ?? '').localeCompare(effectiveEnd(b, today) ?? '')
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
        note: `Gyldig til ${formatDate(p.valid_to)}. Fornyes den automatisk? Slå på «Fornyes automatisk», eller oppdater datoen.`,
        action: { label: 'Oppdater', to: `/forsikringer?rediger=${p.id}` },
      }),
    )

  policies
    .filter((p) => policyStatus(p, today) === 'soon')
    .sort(byEnd)
    .forEach((p) => {
      const days = daysUntil(effectiveEnd(p, today), today)
      const renews = isAutoRenewing(p)
      const when = days === 0 ? 'i dag' : `om ${days} ${days === 1 ? 'dag' : 'dager'}`
      todos.push({
        id: `soon-${p.id}`,
        icon: 'calendar-event',
        title: `«${p.title}» ${renews ? 'fornyes' : 'går ut'} ${when}`,
        note: renews
          ? 'Sjekk pris og vilkår før den fornyes, og at den fortsatt passer for deg.'
          : 'Sjekk at den fornyes, og at den fortsatt passer for deg.',
        action: { label: 'Se', to: `/forsikringer?rediger=${p.id}` },
      })
    })

  // An announced change whose date has passed: the price is probably out of date.
  announcedChanges(policies, today).due.forEach(({ policy, date }) =>
    todos.push({
      id: `change-due-${policy.id}`,
      icon: 'arrow-repeat',
      title: `Varslet endring for «${policy.title}» har trådt i kraft`,
      note: `Den gjaldt fra ${formatDate(date)}. Oppdater prisen, og fjern varselet.`,
      action: { label: 'Oppdater', to: `/forsikringer?rediger=${policy.id}` },
    }),
  )

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

// --- Renewals: policies with an end/renewal date, soonest first ----------------------------------
// `date` is the date that matters (the next renewal for auto-renewing policies); `renews` says which kind it is.

export function upcomingRenewals(policies, today = new Date(), limit = 6) {
  return policies
    .filter((p) => p.valid_to)
    .map((p) => {
      const date = effectiveEnd(p, today)
      return { policy: p, date, renews: isAutoRenewing(p), days: daysUntil(date, today), status: policyStatus(p, today) }
    })
    .filter((r) => r.days >= -365) // don't list things that ended more than a year ago
    .sort((a, b) => a.days - b.days)
    .slice(0, limit)
}

// --- Cost -------------------------------------------------------------------------------------
// "Cost" = premium + fees (see payments.js annualCost). A policy without a premium has no cost yet.

// What the USER pays: only policies where the user is the payer ("Meg selv"; rows without a payer count as the
// user). What others pay (a job, a housing association, a spouse) is reported separately in `others*`.
export function costSummary(policies, today = new Date()) {
  const active = policies.filter((p) => isActive(p, today))
  const priced = active.filter((p) => p.annual_premium != null)
  const mine = priced.filter((p) => (p.payer ?? 'private') === 'private')
  const others = priced.filter((p) => (p.payer ?? 'private') !== 'private')
  const year = mine.reduce((sum, p) => sum + annualCost(p), 0)
  const feesYear = mine.reduce((sum, p) => sum + annualFee(p), 0)
  const othersYear = others.reduce((sum, p) => sum + annualCost(p), 0)

  const byType = new Map()
  mine.forEach((p) => {
    const cur = byType.get(p.insurance_type) ?? { type: p.insurance_type, year: 0, count: 0 }
    cur.year += annualCost(p)
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
    feesYear,
    byArea,
    othersYear,
    othersCount: others.length,
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
      cur.year += annualCost(p) ?? 0
      map.set(p.holder, cur)
    })
  return [...map.values()].sort((a, b) => b.count - a.count)
}

// --- Økonomi: what the HOUSEHOLD pays ----------------------------------------------------------
// The household = the user ("Meg selv") + a spouse/partner. Policies paid by a job, a housing association or
// anyone else are NOT part of it. Expired policies are never counted in the totals; with
// `includeExpired` they are still listed (greyed out) so the user can see what ended.
// Each row has `year` (the premium), `fee` (fees per year) and `total` (premium + fees; null without a premium).
const HOUSEHOLD_PAYERS = ['private', 'spouse']
const payerOf = (p) => p.payer ?? 'private'

export function economySummary(policies, today = new Date(), { includeExpired = false } = {}) {
  const household = policies.filter((p) => HOUSEHOLD_PAYERS.includes(payerOf(p)))

  const allRows = household.map((p) => ({
    policy: p,
    payer: payerOf(p),
    status: policyStatus(p, today),
    year: p.annual_premium != null ? Number(p.annual_premium) : null,
    fee: annualFee(p),
    total: annualCost(p),
  }))
  const counted = allRows.filter((r) => r.status !== 'expired')

  // Biggest cost first; policies without a price last; ties by name.
  const rows = (includeExpired ? allRows : counted).sort(
    (a, b) => (b.total ?? -1) - (a.total ?? -1) || a.policy.title.localeCompare(b.policy.title, 'nb'),
  )

  const part = (payer) => {
    const mine = counted.filter((r) => r.payer === payer)
    const year = mine.reduce((total, r) => total + (r.total ?? 0), 0)
    const fees = mine.reduce((total, r) => total + (r.total !== null ? r.fee : 0), 0)
    return { year, month: year / 12, fees }
  }
  const me = part('private')
  const spouse = part('spouse')
  const householdYear = me.year + spouse.year

  return {
    rows,
    me,
    spouse,
    household: { year: householdYear, month: householdYear / 12, fees: me.fees + spouse.fees },
    missingPrice: counted.filter((r) => r.total === null).length,
    feeNeedsFrequency: counted.filter((r) => feeNeedsFrequency(r.policy)).length,
    expiredCount: allRows.length - counted.length,
    paidByOthers: policies.length - household.length,
    hasSpouseRows: allRows.some((r) => r.payer === 'spouse'),
    // So the page can say WHICH policies are left out and why (instead of just a count):
    // household policies that have expired (hidden unless `includeExpired`), and policies paid by someone else.
    expiredRows: allRows.filter((r) => r.status === 'expired'),
    otherPayerPolicies: policies.filter((p) => !HOUSEHOLD_PAYERS.includes(payerOf(p))),
  }
}

// --- Betalinger: when the payments happen, per insurer ----------------------------------------
// For the household's running policies: how often each is paid, on which day, what one payment costs and when
// the next one is. Grouped by insurer; the insurer with the soonest payment comes first.
// `incomplete` = policies where we can't tell yet (frequency or a payment date is missing).
export function paymentSchedule(policies, today = new Date()) {
  const items = policies
    .filter((p) => HOUSEHOLD_PAYERS.includes(payerOf(p)) && policyStatus(p, today) !== 'expired')
    .map((p) => {
      let next = nextPaymentDate(p.payment_anchor, p.payment_frequency, today)
      // A policy that ends (and does not renew) before its next payment has no more payments.
      if (next && !isAutoRenewing(p) && p.valid_to && next > p.valid_to) next = null
      return {
        policy: p,
        payer: payerOf(p),
        frequency: frequencyOf(p.payment_frequency),
        day: p.payment_anchor ? Number(p.payment_anchor.slice(8, 10)) : null,
        next,
        amount: installmentAmount(p),
      }
    })

  const byNext = (a, b) => (a.next ?? '9999').localeCompare(b.next ?? '9999') || a.policy.title.localeCompare(b.policy.title, 'nb')

  const groupMap = new Map()
  for (const item of items) {
    const name = (item.policy.insurer ?? '').trim()
    const key = name.toLowerCase()
    if (!groupMap.has(key)) groupMap.set(key, { key, insurer: name || null, items: [] })
    groupMap.get(key).items.push(item)
  }
  const groups = [...groupMap.values()]
  groups.forEach((g) => g.items.sort(byNext))
  groups.sort((a, b) => (a.items[0].next ?? '9999').localeCompare(b.items[0].next ?? '9999') || (a.insurer ?? '~').localeCompare(b.insurer ?? '~', 'nb'))

  return {
    groups,
    upcoming: items.filter((i) => i.next).sort(byNext),
    incomplete: items.filter((i) => !i.next),
  }
}

// --- Announced changes: "from 1 January the price rises to …" -------------------------------------
// The user records a change the insurer has announced (a date, optionally a new yearly price and a note).
// `upcoming` = still ahead (or today); `due` = the date has passed but the entry is still there, which means
// the user has not yet updated the price — the dashboard asks them to.
// `delta` is the change in the yearly premium (negative = cheaper); null when either price is unknown.
export function announcedChanges(policies, today = new Date()) {
  const rows = policies
    .filter((p) => p.next_change_date)
    .map((p) => {
      const days = daysUntil(p.next_change_date, today)
      const from = p.annual_premium != null ? Number(p.annual_premium) : null
      const to = p.next_annual_premium != null ? Number(p.next_annual_premium) : null
      return {
        policy: p,
        date: p.next_change_date,
        days,
        note: p.next_change_note ?? null,
        from,
        to,
        delta: from !== null && to !== null ? to - from : null,
      }
    })
    .sort((a, b) => a.date.localeCompare(b.date))

  return { upcoming: rows.filter((r) => r.days >= 0), due: rows.filter((r) => r.days < 0) }
}
