// Pure helpers for "Last ned dataene mine": they turn the user's data into the files that go in the
// zip archive. No network or screens here (the fetching lives in exportData.js), so this is easy to test.

import { strToU8 } from 'fflate'
import { frequencyLabel } from './payments'
import {
  docKindLabel,
  documentCategoryLabel,
  holderLabel,
  insuranceTypeLabel,
  payerLabel,
} from '../content/insuranceTypes'

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

// Puts each downloaded file into `folder/` under a safe, unique name. Returns { names, failed }:
// `names` maps item id → path in the zip, `failed` lists the items whose file could not be fetched.
function placeFiles(files, folder, downloads, fileName, label) {
  const used = new Set()
  const names = new Map()
  const failed = []
  for (const { item, bytes } of downloads) {
    if (!bytes) {
      failed.push({ title: label(item), file_name: fileName(item) })
      continue
    }
    const name = uniqueFileName(safeFileName(fileName(item)), used)
    names.set(item.id, `${folder}/${name}`)
    files[`${folder}/${name}`] = bytes
  }
  return { names, failed }
}

// Inputs (all arrays):
//   policies / documents / providers — database rows
//   events / analyses                — database rows (analyses may be empty)
//   downloaded                       — [{ policy, bytes }]    insurance files (bytes null = fetch failed)
//   docDownloads                     — [{ document, bytes }]  "other documents" files
//   logoDownloads                    — [{ provider, bytes }]  provider logos (a missing logo is not an error)
// Returns { files, failed } where `files` maps path-in-zip → Uint8Array.
export function buildArchiveFiles({
  user,
  policies,
  events,
  analyses = [],
  downloaded,
  documents = [],
  docDownloads = [],
  providers = [],
  logoDownloads = [],
  now = new Date(),
}) {
  const files = {}

  const policyFiles = placeFiles(
    files,
    'filer',
    downloaded.map(({ policy, bytes }) => ({ item: policy, bytes })),
    (p) => p.file_name,
    (p) => p.title,
  )
  const docFiles = placeFiles(
    files,
    'dokumenter',
    docDownloads.map(({ document, bytes }) => ({ item: document, bytes })),
    (d) => d.file_name,
    (d) => d.title,
  )
  const failed = [...policyFiles.failed, ...docFiles.failed]

  // --- insurance policies
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
    paid_by: p.payer ?? null,
    paid_by_label: payerLabel(p.payer),
    valid_from: p.valid_from ?? null,
    valid_to: p.valid_to ?? null,
    auto_renews: p.auto_renews !== false,
    annual_premium_nok: p.annual_premium ?? null,
    payment_frequency: p.payment_frequency ?? null,
    payment_frequency_label: p.payment_frequency ? frequencyLabel(p.payment_frequency) : null,
    payment_date: p.payment_anchor ?? null,
    fee_per_payment_nok: p.fee_per_payment ?? null,
    original_file_name: p.file_name,
    file_in_archive: policyFiles.names.get(p.id) ?? null,
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
      { header: 'Betalt av', get: (r) => r.paid_by_label },
      { header: 'Gyldig fra', get: (r) => r.valid_from },
      { header: 'Gyldig til', get: (r) => r.valid_to },
      { header: 'Fornyes automatisk', get: (r) => (r.auto_renews ? 'ja' : 'nei') },
      { header: 'Pris per år (kr)', get: (r) => r.annual_premium_nok },
      { header: 'Betaler hvor ofte', get: (r) => r.payment_frequency_label },
      { header: 'Betalingsdato', get: (r) => r.payment_date },
      { header: 'Gebyr per faktura (kr)', get: (r) => r.fee_per_payment_nok },
      { header: 'Fil i arkivet', get: (r) => r.file_in_archive },
      { header: 'Opprinnelig filnavn', get: (r) => r.original_file_name },
      { header: 'Lagt til', get: (r) => r.added_at },
    ]),
  )

  // --- other documents
  if (documents.length > 0) {
    const docRows = documents.map((d) => ({
      id: d.id,
      title: d.title,
      category: d.category,
      category_label: documentCategoryLabel(d.category),
      document_date: d.doc_date ?? null,
      notes: d.notes ?? null,
      original_file_name: d.file_name,
      file_in_archive: docFiles.names.get(d.id) ?? null,
      file_size_bytes: d.file_size ?? null,
      mime_type: d.mime_type ?? null,
      added_at: d.created_at,
      consent_at: d.consent_at ?? null,
      consent_version: d.consent_version ?? null,
    }))
    files['andre-dokumenter.json'] = json(docRows)
    files['andre-dokumenter.csv'] = strToU8(
      toCsv(docRows, [
        { header: 'Tittel', get: (r) => r.title },
        { header: 'Kategori', get: (r) => r.category_label },
        { header: 'Dato', get: (r) => r.document_date },
        { header: 'Notater', get: (r) => r.notes },
        { header: 'Fil i arkivet', get: (r) => r.file_in_archive },
        { header: 'Opprinnelig filnavn', get: (r) => r.original_file_name },
        { header: 'Lagt til', get: (r) => r.added_at },
      ]),
    )
  }

  // --- providers (and their logos; a provider without a logo is perfectly normal)
  let logoCount = 0
  if (providers.length > 0) {
    const used = new Set()
    const logoNames = new Map()
    for (const { provider, bytes } of logoDownloads) {
      if (!bytes) continue
      const name = uniqueFileName(`${safeFileName(provider.name)}.png`, used)
      logoNames.set(provider.id, `logoer/${name}`)
      files[`logoer/${name}`] = bytes
      logoCount++
    }
    const providerRows = providers.map((p) => ({
      id: p.id,
      name: p.name,
      website_url: p.website_url ?? null,
      claims_url: p.claims_url ?? null,
      phone: p.phone ?? null,
      claims_phone: p.claims_phone ?? null,
      email: p.email ?? null,
      address: p.address ?? null,
      customer_number: p.customer_number ?? null,
      notes: p.notes ?? null,
      logo_in_archive: logoNames.get(p.id) ?? null,
      added_at: p.created_at,
    }))
    files['forsikringsselskaper.json'] = json(providerRows)
    files['forsikringsselskaper.csv'] = strToU8(
      toCsv(providerRows, [
        { header: 'Navn', get: (r) => r.name },
        { header: 'Nettside', get: (r) => r.website_url },
        { header: 'Meld skade (lenke)', get: (r) => r.claims_url },
        { header: 'Telefon', get: (r) => r.phone },
        { header: 'Skadetelefon', get: (r) => r.claims_phone },
        { header: 'E-post', get: (r) => r.email },
        { header: 'Adresse', get: (r) => r.address },
        { header: 'Kundenummer', get: (r) => r.customer_number },
        { header: 'Notater', get: (r) => r.notes },
        { header: 'Logo i arkivet', get: (r) => r.logo_in_archive },
      ]),
    )
  }

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

  const countIn = (folder) => Object.keys(files).filter((f) => f.startsWith(`${folder}/`)).length
  const lines = [
    'DINE DATA FRA DEKKET',
    `Hentet ut ${now.toLocaleString('nb-NO')} for ${user.email}`,
    '',
    'Dette arkivet inneholder alt Dekket har lagret om deg:',
    '',
    '  kontoopplysninger.json       E-post, når kontoen ble opprettet, og hvilke vilkår du godtok',
    '  forsikringer.csv             Oversikt over forsikringene dine (åpnes i Excel)',
    '  forsikringer.json            Det samme, maskinlesbart, med alle felt',
    '  filer/                       Dokumentene til forsikringene dine, med de opprinnelige filnavnene',
    ...(documents.length > 0
      ? [
          '  andre-dokumenter.csv/.json   Oversikt over andre dokumenter (for eksempel vedtekter)',
          '  dokumenter/                  Filene til de andre dokumentene',
        ]
      : []),
    ...(providers.length > 0
      ? [
          '  forsikringsselskaper.csv/.json  Selskapene dine med kontaktopplysninger og lenker',
          '  logoer/                      Logoene du har lastet opp',
        ]
      : []),
    '  aktivitet.json               Loggen over det som er lagt til, endret og slettet',
    ...(analyses.length > 0 ? ['  analyser.json                Analyser av dokumentene dine'] : []),
    '',
    `Antall forsikringer: ${policies.length}. Filer i arkivet: ${countIn('filer')} (forsikringer)` +
      (documents.length > 0 ? `, ${countIn('dokumenter')} (andre dokumenter)` : '') +
      (providers.length > 0 ? `, ${logoCount} (logoer)` : '') +
      '.',
  ]
  if (failed.length > 0) {
    lines.push('', 'OBS: Disse filene kunne ikke hentes og mangler i arkivet. Prøv å laste ned på nytt:')
    for (const f of failed) lines.push(`  - ${f.title} (${f.file_name})`)
  }
  lines.push('', 'Du kan slette kontoen og alle dataene under «Konto» i appen.')
  files['LESMEG.txt'] = strToU8(lines.join('\r\n') + '\r\n')

  return { files, failed }
}
