// TEMPORARY example data for the coverage overview on the dashboard.
// Written by hand from the test documents so we can design the screens before the
// AI analysis exists. Once analysis results are stored in the database, the dashboard
// reads those instead and this file is deleted.
//
// status: 'check' = something needs checking, 'none' = no document yet.
// icon: a Bootstrap Icons name without the "bi-" prefix (https://icons.getbootstrap.com).

export const sampleAreas = [
  { id: 'contents', name: 'Innbo', icon: 'box-seam', status: 'check', label: 'Sjekk', note: 'KLP · perioden gikk ut 30.06.2025' },
  { id: 'travel', name: 'Reise', icon: 'airplane', status: 'check', label: 'Mangler bevis', note: 'Storebrand · vilkår uten forsikringsbevis' },
  { id: 'life', name: 'Liv', icon: 'heart', status: 'check', label: 'Delvis', note: 'Frende · generelle vilkår mangler' },
  { id: 'disability', name: 'Uførepensjon', icon: 'heart-pulse', status: 'check', label: 'Delvis', note: 'Frende · generelle vilkår mangler' },
  { id: 'building', name: 'Bygning', icon: 'building', status: 'none', label: 'Mangler', note: 'Spør sameiet om en kopi' },
  { id: 'car', name: 'Bil', icon: 'car-front', status: 'none', label: 'Mangler', note: 'Ingen dokument ennå' },
]

// action: null = no button yet. `to` is a page in the app.
export const sampleTodos = [
  { id: 'renew', icon: 'calendar-event', title: 'Sjekk om innboforsikringen er fornyet', note: 'Dokumentet gjelder til 30.06.2025.', action: { label: 'Last opp ny', to: '/legg-til' } },
  { id: 'travel-proof', icon: 'file-earmark-plus', title: 'Legg til forsikringsbeviset for reise', note: 'Da kan vi si hva du faktisk har dekning for.', action: { label: 'Last opp', to: '/legg-til' } },
  { id: 'building', icon: 'building', title: 'Be sameiet om bygningsforsikringen', note: 'Sameiet har trolig en felles forsikring for bygget.', action: null },
]
