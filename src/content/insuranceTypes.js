// The kinds of insurance a user can tag a policy with. Each one is also a "coverage area"
// on the dashboard (except "other").
// `value` is what's stored in the database, `label` is what the user sees,
// `icon` is a Bootstrap Icons name without "bi-".
export const insuranceTypes = [
  { value: 'home', label: 'Bolig / bygning', icon: 'house-door' },
  { value: 'contents', label: 'Innbo', icon: 'box-seam' },
  { value: 'car', label: 'Bil', icon: 'car-front' },
  { value: 'travel', label: 'Reise', icon: 'airplane' },
  { value: 'health', label: 'Helse / ulykke', icon: 'bandaid' },
  { value: 'life', label: 'Liv', icon: 'heart' },
  { value: 'disability', label: 'Uførepensjon', icon: 'person-wheelchair' },
  { value: 'other', label: 'Annet', icon: 'shield-check' },
]

export function insuranceTypeLabel(value) {
  return insuranceTypes.find((t) => t.value === value)?.label ?? 'Annet'
}

// Who took out the policy — insurance is often held via a job, the housing association, a spouse …
export const holders = [
  { value: 'private', label: 'Privat (meg selv)' },
  { value: 'work', label: 'Via jobben' },
  { value: 'sameie', label: 'Via sameiet / borettslaget' },
  { value: 'spouse', label: 'Via ektefelle / samboer' },
  { value: 'other', label: 'Annet' },
]

export function holderLabel(value) {
  return holders.find((h) => h.value === value)?.label ?? 'Annet'
}
