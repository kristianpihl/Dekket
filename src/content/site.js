// Global site content — name and copy that's reused across pages.

export const site = {
  name: 'Dekket',
  tagline: 'Vit hva du er dekket for, før skaden skjer.',
  description:
    'Forsikringsoversikten som er på din side. Samle forsikringene dine, få dem forklart, og se hva som mangler.',
}

// The left-hand menu inside the app, top to bottom.
// To add a page: add a line here, then add a <Route> for it in src/routes.jsx.
// `icon` is a Bootstrap Icons name without "bi-" (https://icons.getbootstrap.com).
export const appNav = [
  { label: 'Dashboard', to: '/dashboard', icon: 'grid' },
  { label: 'Legg til forsikring', to: '/legg-til', icon: 'plus-circle' },
  { label: 'Mine forsikringer', to: '/forsikringer', icon: 'table' },
  { label: 'Analyse', to: '/analyse', icon: 'stars' },
]
