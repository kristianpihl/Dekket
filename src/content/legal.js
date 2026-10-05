// Facts used by the Vilkår (terms) and Personvern (privacy) pages.
// Anything in [FYLL INN: …] must be replaced with the real value before launch —
// the pages show it highlighted so it can't be missed.

// Set to false when a lawyer has reviewed the texts — the yellow "utkast" banner disappears.
export const LEGAL_DRAFT = true

// Bump LEGAL_VERSION whenever the texts change in a way users should re-accept.
// It is saved on each new account together with the time of acceptance.
export const LEGAL_VERSION = '2026-10-06'
export const LEGAL_UPDATED = '6. oktober 2026'

export const operator = {
  name: '[FYLL INN: navn på ansvarlig person eller foretak]',
  orgNumber: '[FYLL INN: organisasjonsnummer]',
  address: '[FYLL INN: postadresse]',
  email: '[FYLL INN: kontakt-e-post for personvern og support]',
}

export const priceText = '39 kr per måned inkludert mva'
