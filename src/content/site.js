// Global site content — name and copy that's reused across pages.

export const site = {
  name: 'Dekket',
  tagline: 'Vit hva du er dekket for, før skaden skjer.',
  description:
    'Forsikringsoversikten som er på din side. Samle forsikringene dine, få dem forklart, og se hva som mangler.',
}

// Features that are built but switched on/off here. Turn one on when it is ready for users.
// analysis: the AI analysis of documents (needs ANTHROPIC_API_KEY, supabase/analysis.sql, and the
//           AI provider named in the privacy policy — see src/pages/Privacy.jsx).
export const features = {
  analysis: false,
}

// The left-hand menu inside the app, top to bottom.
// An item with `feature: 'x'` is only shown when features.x is true.
// To add a page: add a line here, then add a <Route> for it in src/routes.jsx.
// `icon` is a Bootstrap Icons name without "bi-" (https://icons.getbootstrap.com).
export const appNav = [
  { label: 'Dashboard', to: '/dashboard', icon: 'grid' },
  { label: 'Legg til forsikring', to: '/legg-til', icon: 'plus-circle' },
  { label: 'Mine forsikringer', to: '/forsikringer', icon: 'table' },
  { label: 'Analyse', to: '/analyse', icon: 'stars', feature: 'analysis' },
  { label: 'Konto', to: '/konto', icon: 'person-circle' },
]
