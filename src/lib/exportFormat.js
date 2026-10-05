// Pure helpers for "Last ned dataene mine": they turn the user's data into the files that go in the
// zip archive. No network or screens here (the fetching lives in exportData.js), so this is easy to test.

import { strToU8 } from 'fflate'
import { docKindLabel, holderLabel, insuranceTypeLabel } from '../content/insuranceTypes'

// A file name that is safe on Windows, Mac and Linux. Keeps letters like æ, ø, å.
export function safeFileName(name) {
  const cleaned = String(name ?? '')
    .normalize('NFC')
    // eslint-disable-next-line no-control-regex
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+/, '')
  return cleaned.slice(0, 120) || 'fil'
}

// "avtale.pdf" → "avtale.pdf", then "avtale (2).pdf", "avtale (3).pdf" … `used` remembers names already taken.
export function uniqueFileName(name, used) {
  const dot = name.lastIndexOf('.')
  const stem = dot > 0 ? name.slice(0, dot) : name
  const ext = dot > 0 ? name.slice(dot) : ''
  let candidate = name
  for (let n = 2; used.has(candidate.toLowerCase()); n++) candidate = `${stem} (${n})${ext}`
  used.add(candidate.toLowerCase())
  return candidate
}

// One CSV cell. Semicolon-separated (what Norwegian Excel expects), quotes doubled.
function csvCell(value) {
  if (value == null) return ''
  const text = String(value)
  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(rows, columns) {
  const lines = [columns.map((c) => csvCell(c.header)).join(';')]
  for (const row of rows) lines.push(columns.map((c) => csvCell(c.get(row))).join(';'))
  return `﻿${lines.join('\r\n')}\r\n` // BOM so Excel reads æ, ø, å correctly
}

const json = (value) => strToU8(JSON.stringify(value, null, 2))

// downloaded: [{ policy, bytes }] — bytes is a Uint8Array, or null when the file could not be fetched.
// Returns { files, failed } where `files` maps path-in-zip → Uint8Array.
export function buildArchiveFiles({ user, policies, events, analyses, downloaded, now = new Date() }) {
  const files = {}
  const failed = []
  const used = new Set()
  const archiveNameById = new Map()

  for (const { policy, bytes } of downloaded) {
    if (!bytes) {
      failed.push({ title: policy.title, file_name: policy.file_name })
      continue
    }
    const name = uniqueFileName(safeFileName(policy.file_name), used)
    archiveNameById.set(policy.id, `filer/${name}`)
    files[`filer/${name}`] = bytes
  }

  const policyRows = policies.map((p) => ({
    id: p.id,
    title: p.title,
    insurance_type: p.insurance_type,
    insurance_type_label: insuranceTypeLabel(p.insurance_type),
    document_kind: p.doc_kind ?? 'unknown',
    document_kind_label: docKindLabel(p.doc_kind),
    insurer: p.insurer ?? null,
    held_via: p.holder ?? null,
    held_via_label: holderLabel(p.holder),
    valid_from: p.valid_from ?? null,
    valid_to: p.valid_to ?? null,
    annual_premium_nok: p.annual_premium ?? null,
    original_file_name: p.file_name,
    file_in_archive: archiveNameById.get(p.id) ?? null,
    file_size_bytes: p.file_size ?? null,
    mime_type: p.mime_type ?? null,
    added_at: p.created_at,
    consent_at: p.consent_at ?? null,
    consent_version: p.consent_version ?? null,
  }))

  files['forsikringer.json'] = json(policyRows)
  files['forsikringer.csv'] = strToU8(
    toCsv(policyRows, [
      { header: 'Navn', get: (r) => r.title },
      { header: 'Type forsikring', get: (r) => r.insurance_type_label },
      { header: 'Dokumenttype', get: (r) => r.document_kind_label },
      { header: 'Forsikringsselskap', get: (r) => r.insurer },
      { header: 'Tegnet via', get: (r) => r.held_via_label },
      { header: 'Gyldig fra', get: (r) => r.valid_from },
      { header: 'Gyldig til', get: (r) => r.valid_to },
      { header: 'Pris per år (kr)', get: (r) => r.annual_premium_nok },
      { header: 'Fil i arkivet', get: (r) => r.file_in_archive },
      { header: 'Opprinnelig filnavn', get: (r) => r.original_file_name },
      { header: 'Lagt til', get: (r) => r.added_at },
    ]),
  )

  files['kontoopplysninger.json'] = json({
    email: user.email,
    user_id: user.id,
    account_created_at: user.created_at ?? null,
    accepted_terms_version: user.user_metadata?.accepted_terms_version ?? null,
    accepted_terms_at: user.user_metadata?.accepted_terms_at ?? null,
    exported_at: now.toISOString(),
  })
  files['aktivitet.json'] = json(events)
  if (analyses.length > 0) files['analyser.json'] = json(analyses)

  const lines = [
    'DINE DATA FRA DEKKET',
    `Hentet ut ${now.toLocaleString('nb-NO')} for ${user.email}`,
    '',
    'Dette arkivet inneholder alt Dekket har lagret om deg:',
    '',
    '  kontoopplysninger.json  E-post, når kontoen ble opprettet, og hvilke vilkår du godtok',
    '  forsikringer.csv        Oversikt over forsikringene dine (åpnes i Excel)',
    '  forsikringer.json       Det samme, maskinlesbart, med alle felt',
    '  aktivitet.json          Loggen over det som er lagt til, endret og slettet',
    '  filer/                  Dokumentene du har lastet opp, med de opprinnelige filnavnene',
    ...(analyses.length > 0 ? ['  analyser.json           Analyser av dokumentene dine'] : []),
    '',
    `Antall forsikringer: ${policies.length}. Filer i arkivet: ${Object.keys(files).filter((f) => f.startsWith('filer/')).length}.`,
  ]
  if (failed.length > 0) {
    lines.push('', 'OBS: Disse filene kunne ikke hentes og mangler i arkivet. Prøv å laste ned på nytt:')
    for (const f of failed) lines.push(`  - ${f.title} (${f.file_name})`)
  }
  lines.push('', 'Du kan slette kontoen og alle dataene under «Konto» i appen.')
  files['LESMEG.txt'] = strToU8(lines.join('\r\n') + '\r\n')

  return { files, failed }
}
