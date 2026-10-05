// The kinds of insurance a user can tag a document with.
// `value` is what's stored in the database, `label` is what the user sees.
export const insuranceTypes = [
  { value: 'home', label: 'Bolig / hus' },
  { value: 'contents', label: 'Innbo' },
  { value: 'car', label: 'Bil' },
  { value: 'travel', label: 'Reise' },
  { value: 'health', label: 'Helse / ulykke' },
  { value: 'life', label: 'Liv' },
  { value: 'other', label: 'Annet' },
]

export function insuranceTypeLabel(value) {
  return insuranceTypes.find((t) => t.value === value)?.label ?? 'Annet'
}
