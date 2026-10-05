// Date helpers on plain "YYYY-MM-DD" strings (what the database stores for a `date` column).
// Working with strings and whole days avoids time-zone surprises; ISO dates also sort correctly as text.

const pad = (n) => String(n).padStart(2, '0')

export function parseDate(text) {
  const [y, m, d] = text.split('-').map(Number)
  return { y, m, d }
}

const toIso = ({ y, m, d }) => `${y}-${pad(m)}-${pad(d)}`

// Number of days in month `m` (1–12) of year `y`.
const daysInMonth = (y, m) => new Date(y, m, 0).getDate()

// Today as "YYYY-MM-DD" in the user's own time zone.
export function todayIso(today = new Date()) {
  return toIso({ y: today.getFullYear(), m: today.getMonth() + 1, d: today.getDate() })
}

// Whole calendar months from date `a` to date `b` (ignores the day of month). Negative if b is before a.
export function monthsBetween(a, b) {
  const pa = parseDate(a)
  const pb = parseDate(b)
  return (pb.y - pa.y) * 12 + (pb.m - pa.m)
}

// Adds `months` to a date. If the target month is shorter, the day is clamped to its last day
// (31 Jan + 1 month = 28/29 Feb). `day` lets you keep aiming at the ORIGINAL day of month, so a payment
// on the 31st returns to the 31st after a short month instead of drifting to the 28th for good.
export function addMonths(text, months, day) {
  const p = parseDate(text)
  const total = p.y * 12 + (p.m - 1) + months
  const y = Math.floor(total / 12)
  const m = (((total % 12) + 12) % 12) + 1
  return toIso({ y, m, d: Math.min(day ?? p.d, daysInMonth(y, m)) })
}

export const addYears = (text, years) => addMonths(text, years * 12)
