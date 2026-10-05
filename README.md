# Dekket

Nettside hvor brukere kan laste opp forsikringene sine og få hjelp til å forstå
hva de er dekket for.

## Teknologi

- **Vite + React** (frontend)
- **React Router** (sidenavigasjon)
- **react-bootstrap** (UI-komponenter)
- **Supabase** (database, innlogging, fillagring)
- **Vercel** (hosting + serverless-funksjoner i `api/` for ting som trenger
  hemmelige nøkler, f.eks. AI-analyse)

## Kom i gang lokalt

```bash
npm install
cp .env.example .env   # fyll inn Supabase-nøklene dine
npm run dev
```

Åpne <http://localhost:5173>.

## Prosjektstruktur

- `src/pages/` — én fil per side (Dashboard, AddPolicy, Policies, Analysis, …)
- `src/components/` — gjenbrukbare UI-deler (AppLayout med sidepanel, SidebarNav, …)
- `src/forms/` — skjemaer (UploadPolicyForm = veiviseren for å legge til forsikring)
- `src/content/` — tekst/innhold som ikke ligger i databasen
  (`site.js` har menyen i sidepanelet: `appNav`)
- `src/lib/` — Supabase-klient, `usePolicies`, `policyActions`, små hjelpere.
  `overview.js` har alle beregningene bak dashboardet (status, frister, kostnader)
- `src/routes.jsx` — alle sider/URL-er
- `supabase/` — SQL som kjøres i Supabase SQL Editor, i denne rekkefølgen:
  `documents.sql` → `account.sql` → `dashboard.sql` → `doc-kind.sql` → `payers-documents-providers.sql`
  (alle kan kjøres flere ganger).
  `analysis.sql` trengs først når analysen skrus på

**Funksjonsbrytere:** `features` i `src/content/site.js` skrur ferdigbygde funksjoner av/på.
Analysen (`features.analysis`) er foreløpig AV.

**Slik legger du til en ny side i appen:** lag filen i `src/pages/`, legg til en
`<Route>` i `src/routes.jsx`, og en linje i `appNav` i `src/content/site.js`.
- `api/` — Vercel serverless-funksjoner. `analyze.js` analyserer et dokument med Claude (nøkkelen
  `ANTHROPIC_API_KEY` ligger kun på serveren). `_analysis.js` har spørsmålet og svarformatet.
  Lokalt kjører `npm run dev` de samme filene via en liten plugin i `vite.config.js`.

## Status

- [x] Steg 0: Prosjektskjelett (Vite+React+Router, tom forside + dashboard)
- [x] Steg 1: Supabase-prosjekt opprettet + innlogging (e-post/passord)
- [x] Steg 2: Opplasting av forsikringsdokumenter (privat Supabase Storage-bøtte) —
      krever at `supabase/documents.sql` kjøres i Supabase SQL Editor
- [x] Steg 3: Liste over opplastede forsikringer i dashboard (åpne + slett)
- [ ] Steg 4: Første AI-analyse av et dokument
- [ ] Steg 5: Visning av analyseresultat i UI
