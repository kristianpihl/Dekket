// Form values for "Andre dokumenter" (documents that are not insurance policies).

export const emptyDocument = { title: '', category: 'bylaws', docDate: '', notes: '' }

export function documentValues(d) {
  return { title: d.title ?? '', category: d.category ?? 'other', docDate: d.doc_date ?? '', notes: d.notes ?? '' }
}

export function documentFields(v, fallbackTitle = '') {
  return {
    title: v.title.trim() || fallbackTitle,
    category: v.category,
    doc_date: v.docDate || null,
    notes: v.notes.trim() || null,
  }
}
