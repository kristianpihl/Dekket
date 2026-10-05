// Payment logic: how often a policy is paid, when the next payment happens, what one payment costs,
// and what the fees add up to per year. Pure functions — no network or screens.

import { addMonths, monthsBetween, parseDate, todayIso } from './dates'

export const FREQUENCIES = [
  { value: 'monthly', label: 'Månedlig', months: 1, perYear: 12 },
  { value: 'quarterly', label: 'Hvert kvartal', months: 3, perYear: 4 },
  { value: 'semiannual', label: 'Halvårlig', months: 6, perYear: 2 },
  { value: 'annual', label: 'Årlig', months: 12, perYear: 1 },
]

export const frequencyOf = (value) => FREQUENCIES.find((f) => f.value === value) ?? null
export const frequencyLabel = (value) => frequencyOf(value)?.label ?? 'Ikke oppgitt'

// The first payment day on or after today. `anchor` is ONE known payment day (the last or the next one);
// the others follow from the frequency: monthly = every month on the same day, and so on.
// A payment on the 31st falls on the last day of shorter months, then returns to the 31st.
// Returns "YYYY-MM-DD", or null when the frequency or the anchor is missing.
export function nextPaymentDate(anchor, frequency, today = new Date()) {
  const freq = frequencyOf(frequency)
  if (!anchor || !freq) return null

  const now = todayIso(today)
  const day = parseDate(anchor).d
  const occurrence = (k) => addMonths(anchor, k * freq.months, day)

  // Start near the answer, then step to the exact one.
  let k = Math.floor(monthsBetween(anchor, now) / freq.months)
  while (occurrence(k) < now) k++
  while (occurrence(k - 1) >= now) k--
  return occurrence(k)
}

// What one payment costs: the premium share plus the fee. null if the premium is unknown or there is
// no frequency to split it by.
export function installmentAmount(policy) {
  const freq = frequencyOf(policy.payment_frequency)
  if (!freq || policy.annual_premium == null) return null
  return Number(policy.annual_premium) / freq.perYear + Number(policy.fee_per_payment ?? 0)
}

// Fees per year = fee per payment × payments per year. 0 when there is no fee, or when the frequency is
// unknown (then it can't be calculated — see `feeNeedsFrequency`).
export function annualFee(policy) {
  const freq = frequencyOf(policy.payment_frequency)
  if (!freq || policy.fee_per_payment == null) return 0
  return Number(policy.fee_per_payment) * freq.perYear
}

// A fee has been entered but we don't know how often it is charged, so it is NOT in the totals.
export const feeNeedsFrequency = (policy) =>
  policy.fee_per_payment != null && Number(policy.fee_per_payment) > 0 && !frequencyOf(policy.payment_frequency)

// What the policy really costs per year: premium + fees. null when there is no premium.
export function annualCost(policy) {
  if (policy.annual_premium == null) return null
  return Number(policy.annual_premium) + annualFee(policy)
}
