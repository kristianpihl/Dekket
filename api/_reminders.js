// The logic behind the daily reminder e-mails: which reminders are due, what the e-mail says, and the loop
// that sends them. Server-only (the leading underscore keeps Vercel from exposing this file as an endpoint).
//
// This file is deliberately SELF-CONTAINED — it does not import from src/. The server runs plain Node ESM,
// which wants explicit file extensions in imports, while the app's code (built by Vite) leaves them out.
// The few date rules we need are therefore copied here, and a test checks they give the same answers as the app's.
//
// Rules:
//  - A reminder goes out when a renewal / end date, or an announced change, is at most N days away, for the N the
//    user picked (e.g. 30 and 7). Only the TIGHTEST bucket counts: 5 days before, the "7 days" reminder is sent,
//    not "30" and "7" together. Each (policy, kind, date, bucket) is sent exactly once.
//  - E-mails contain names, dates and prices — never anything from inside the documents.

const pad = (n) => String(n).padStart(2, '0')
const toIso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`
const daysInMonth = (y, m) => new Date(y, m, 0).getDate()
const parse = (s) => {
  const [y, m, d] = s.split('-').map(Number)
  return { y, m, d }
}

export const todayIso = (today) => toIso(today.getFullYear(), today.getMonth() + 1, today.getDate())

function monthsBetween(a, b) {
  const pa = parse(a)
  const pb = parse(b)
  return (pb.y - pa.y) * 12 + (pb.m - pa.m)
}

function addYears(text, years) {
  const p = parse(text)
  const y = p.y + years
  return toIso(y, p.m, Math.min(p.d, daysInMonth(y, p.m)))
}

export function daysUntil(dateStr, today) {
  if (!dateStr) return null
  const { y, m, d } = parse(dateStr)
  const end = new Date(y, m - 1, d)
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((end - start) / 86400000)
}

// A policy without the flag counts as auto-renewing (the database default).
export const isAutoRenewing = (policy) => policy.auto_renews !== false

// The date the policy ends — or, if it renews by itself, the next renewal (see effectiveEnd in src/lib/overview.js).
export function effectiveEnd(policy, today) {
  const end = policy.valid_to
  if (!end) return null
  if (!isAutoRenewing(policy)) return end

  const now = todayIso(today)
  if (end >= now) return end

  let years = Math.max(1, Math.floor(monthsBetween(end, now) / 12))
  while (addYears(end, years) < now) years++
  while (years > 1 && addYears(end, years - 1) >= now) years--
  return addYears(end, years)
}

// The reminder "bucket" for a date `days` away: the smallest lead time (in days) that is at least `days`.
// null when the date has passed, or is further away than the longest lead time.
export function reminderBucket(days, leadDays) {
  if (days === null || days < 0) return null
  const leads = [...leadDays].filter((n) => Number.isInteger(n) && n >= 0).sort((a, b) => a - b)
  return leads.find((lead) => days <= lead) ?? null
}

// Which reminders are due for one user. `sent` = rows already in the log ({ policy_id, kind, target_date, lead_days }).
export function buildReminders({ policies, leadDays, sent, today }) {
  const done = new Set(sent.map((s) => `${s.policy_id}|${s.kind}|${s.target_date}|${s.lead_days}`))
  const items = []

  const consider = (policy, kind, targetDate, extra) => {
    const days = daysUntil(targetDate, today)
    const lead = reminderBucket(days, leadDays)
    if (lead === null) return
    if (done.has(`${policy.id}|${kind}|${targetDate}|${lead}`)) return
    items.push({ policyId: policy.id, kind, targetDate, lead, days, title: policy.title, insurer: policy.insurer ?? null, ...extra })
  }

  for (const policy of policies) {
    const end = effectiveEnd(policy, today)
    if (end) consider(policy, 'renewal', end, { renews: isAutoRenewing(policy) })
    if (policy.next_change_date) {
      consider(policy, 'change', policy.next_change_date, {
        note: policy.next_change_note ?? null,
        from: policy.annual_premium != null ? Number(policy.annual_premium) : null,
        to: policy.next_annual_premium != null ? Number(policy.next_annual_premium) : null,
      })
    }
  }
  return items.sort((a, b) => a.days - b.days || a.title.localeCompare(b.title, 'nb'))
}

// --- The e-mail ----------------------------------------------------------------------------------------

export const escapeHtml = (value) =>
  String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

const longDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })
const kr = (n) => `${Math.round(n).toLocaleString('nb-NO')} kr`
const inDays = (days) => (days === 0 ? 'i dag' : days === 1 ? 'i morgen' : `om ${days} dager`)

// One reminder as plain sentences: { headline, detail[] }.
function describe(item) {
  const name = item.insurer ? `${item.title} (${item.insurer})` : item.title
  if (item.kind === 'change') {
    const detail = []
    if (item.to !== null) {
      const delta = item.from !== null ? item.to - item.from : null
      detail.push(
        `Ny pris: ${kr(item.to)} per år${delta ? ` (${delta > 0 ? '+' : '−'}${kr(Math.abs(delta))})` : ''}.`,
      )
    }
    if (item.note) detail.push(item.note)
    return { headline: `${name}: en varslet endring trer i kraft ${longDate(item.targetDate)} (${inDays(item.days)}).`, detail }
  }
  return item.renews
    ? {
        headline: `${name} fornyes ${longDate(item.targetDate)} (${inDays(item.days)}).`,
        detail: ['Sjekk pris og vilkår før den fornyes, og at den fortsatt passer for deg.'],
      }
    : {
        headline: `${name} går ut ${longDate(item.targetDate)} (${inDays(item.days)}).`,
        detail: ['Sjekk at du har den dekningen du trenger fra dagen den går ut.'],
      }
}

// Builds the subject, plain text and HTML for one user's reminders (all due items in ONE e-mail).
export function renderEmail({ items, appUrl }) {
  const settingsUrl = `${appUrl}/konto`
  const subject =
    items.length === 1
      ? `Dekket: «${items[0].title}» ${items[0].kind === 'change' ? 'endres' : items[0].renews ? 'fornyes' : 'går ut'} ${inDays(items[0].days)}`
      : `Dekket: ${items.length} forsikringer trenger oppmerksomhet snart`

  const lines = items.map(describe)
  const footer = `Du får denne e-posten fordi du har slått på påminnelser i Dekket. Du kan slå dem av under Konto: ${settingsUrl}`
  const disclaimer = 'Dekket gir informasjon og oversikt, ikke forsikringsrådgivning. Du er selv ansvarlig for at du er dekket.'

  const text = [
    'Hei!',
    '',
    ...lines.flatMap((l) => ['• ' + l.headline, ...l.detail.map((d) => '  ' + d), '']),
    `Åpne Dekket: ${appUrl}/dashboard`,
    '',
    footer,
    disclaimer,
  ].join('\n')

  const html = `<!doctype html><html lang="no"><body style="margin:0;background:#f6f6f9;font-family:Arial,Helvetica,sans-serif;color:#2b2b33">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;padding:24px" cellpadding="0" cellspacing="0"><tr><td>
<p style="margin:0 0 4px;font-size:22px;color:#3c3489"><strong>Dekket</strong></p>
<p style="margin:0 0 16px;color:#6b6b78">En påminnelse om forsikringene dine</p>
${lines
  .map(
    (l) =>
      `<p style="margin:0 0 4px;font-size:15px"><strong>${escapeHtml(l.headline)}</strong></p>` +
      l.detail.map((d) => `<p style="margin:0 0 4px;font-size:14px;color:#6b6b78">${escapeHtml(d)}</p>`).join('') +
      '<div style="height:12px"></div>',
  )
  .join('')}
<p style="margin:8px 0 20px"><a href="${escapeHtml(appUrl)}/dashboard" style="background:#5b4bdb;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:99px;font-size:14px;display:inline-block">Åpne Dekket</a></p>
<p style="margin:0 0 6px;font-size:12px;color:#6b6b78">${escapeHtml(footer)}</p>
<p style="margin:0;font-size:12px;color:#6b6b78">${escapeHtml(disclaimer)}</p>
</td></tr></table></td></tr></table></body></html>`

  return { subject, text, html }
}

// --- The loop --------------------------------------------------------------------------------------------
// `deps` supplies everything that touches the outside world, so this loop can be tested with fakes:
//   loadEnabledUsers() → [{ user_id, lead_days }]      loadPolicies(userId) → policy rows
//   loadSent(userId)   → rows from the reminder log    getEmail(userId)     → address or null
//   claim(rows)        → true if the log rows were written (false = someone else already did)
//   release(rows)      → removes them again (used when sending fails, so tomorrow retries)
//   send({ to, subject, text, html })                  → throws on failure
// The log rows are written BEFORE sending ("claim"), so a crash or an overlapping run can never send twice.
// With `dry` nothing is claimed or sent; the summary only counts what WOULD go out.
export async function runReminders({ deps, today, appUrl, dry = false }) {
  const summary = { users: 0, reminders: 0, emails: 0, failed: 0, dry }

  for (const user of await deps.loadEnabledUsers()) {
    summary.users++
    try {
      const policies = await deps.loadPolicies(user.user_id)
      const sent = await deps.loadSent(user.user_id)
      const items = buildReminders({ policies, leadDays: user.lead_days ?? [30, 7], sent, today })
      if (items.length === 0) continue
      summary.reminders += items.length
      if (dry) continue

      const to = await deps.getEmail(user.user_id)
      if (!to) {
        summary.failed++
        continue
      }

      const rows = items.map((i) => ({ user_id: user.user_id, policy_id: i.policyId, kind: i.kind, target_date: i.targetDate, lead_days: i.lead }))
      if (!(await deps.claim(rows))) continue // already handled by another run

      try {
        await deps.send({ to, ...renderEmail({ items, appUrl }) })
        summary.emails++
      } catch {
        await deps.release(rows)
        summary.failed++
      }
    } catch {
      summary.failed++ // one user's problem must not stop the others
    }
  }
  return summary
}
