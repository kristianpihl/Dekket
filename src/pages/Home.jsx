import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../components/AuthProvider'

// The public front page. All the text lives in the lists below so it's easy to edit.
// `icon` is a Bootstrap Icons name without "bi-".

const problems = [
  { icon: 'layers', title: 'Spredt', text: 'Via jobben, sameiet, ektefellen og flere selskaper. Ingen har hele bildet.' },
  { icon: 'folder-symlink', title: 'Gjemt', text: 'Vilkår som viser til andre vilkår, som viser til enda flere.' },
  { icon: 'clock-history', title: 'For sent', text: 'Du lærer hva som er dekket først når skaden er skjedd. Det blir dyrt.' },
]

const steps = [
  { icon: 'upload', title: '1. Last opp', text: 'Forsikringsbevis, vilkår og sameiets vedtekter som PDF.' },
  { icon: 'search', title: '2. Vi leser', text: 'Dekket går gjennom dokumentene og følger henvisningene.' },
  { icon: 'eye', title: '3. Du ser det klart', text: 'Hva du har, hva som mangler og hva du bør sjekke.' },
]

// soon: shown as a small "kommer"/"senere" badge — these are not built yet.
const features = [
  { icon: 'grid', title: 'Full oversikt', text: 'Bolig, innbo, bil, reise, liv og mer, uansett hvem som har tegnet den.' },
  { icon: 'translate', title: 'Forklart enkelt', soon: 'kommer', text: 'Vilkårene på vanlig norsk.' },
  { icon: 'question-circle', title: 'Hva om …?', soon: 'kommer', text: 'Test om du er dekket for en situasjon før den skjer.' },
  { icon: 'bell', title: 'Endringer og påminnelser', soon: 'senere', text: 'Se hva som er endret, og få beskjed før noe utløper.' },
]

const promises = [
  'Vi selger ikke forsikring og tar ingen provisjon',
  'Ingen annonser, og vi selger aldri dataene dine',
  'Du betaler oss, ikke selskapene',
  'Filene lagres privat i EU, og bare du ser dem',
]

const planPoints = [
  'Ubegrenset antall forsikringer',
  'Oversikt, analyse og nye funksjoner',
  'Si opp når du vil',
]

const faqs = [
  { q: 'Hvordan tjener dere penger?', a: 'Du betaler 39 kr i måneden. Vi tar ingenting fra forsikringsselskaper, og vi selger ikke forsikring.' },
  { q: 'Erstatter dette forsikringsselskapet eller en rådgiver?', a: 'Nei. Dekket gir en forklaring og en oversikt, men det er forsikringsvilkårene og selskapet som avgjør hva du har krav på.' },
  { q: 'Hvem kan se dokumentene mine?', a: 'Bare du. Filene lagres privat i EU, og du kan slette dem når som helst.' },
  { q: 'Hvilke dokumenter kan jeg laste opp?', a: 'PDF, JPG og PNG, opptil 10 MB per fil.' },
]

export default function Home() {
  const { user } = useAuth()
  const { hash } = useLocation()

  // Lets links like /#pris scroll to the right section, also from other pages.
  useEffect(() => {
    if (hash) document.querySelector(hash)?.scrollIntoView()
  }, [hash])

  // Logged out: go to the sign-up form. Logged in: straight to the app.
  const startLink = user ? '/dashboard' : '/login?ny=1'

  return (
    <>
      <section className="lp-band lp-band--card lp-hero">
        <div className="lp-inner lp-hero-grid">
          <div>
            <span className="lp-badge">På din side · ingen provisjon</span>
            <h1>Vit hva du er dekket for, før skaden skjer.</h1>
            <p className="lp-lead">
              Forsikringsoversikten som er på din side. Samle forsikringene dine, få dem forklart,
              og se hva som mangler.
            </p>
            <div className="lp-actions">
              <Link to={startLink} className="cta">
                Kom i gang
              </Link>
              <a href="#slik-fungerer-det" className="btn btn-outline-secondary lp-ghost">
                Se hvordan det fungerer
              </a>
            </div>
            <p className="lp-fine">Gratis å prøve mens vi bygger. Deretter 39 kr i måneden.</p>
          </div>

          <div className="lp-preview" aria-hidden="true">
            <div className="lp-preview-top">
              <div className="lp-preview-ring">
                <span>4 av 6</span>
                <small>DEKKET</small>
              </div>
              <div>
                <div className="lp-preview-title">Din dekningsoversikt</div>
                <div className="lp-muted">4 ting er verdt å sjekke</div>
              </div>
            </div>
            <div className="lp-preview-row">
              <span>
                <b>Innbo</b> · perioden gikk ut
              </span>
              <span className="pill pill--warn">Sjekk</span>
            </div>
            <div className="lp-preview-row">
              <span>
                <b>Reise</b> · bevis mangler
              </span>
              <span className="pill pill--warn">Mangler</span>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-band">
        <div className="lp-inner">
          <h2>De fleste oppdager hullene når det er for sent</h2>
          <p className="lp-sub">Forsikring er lett å glemme, og vanskelig å forstå, til du trenger den.</p>
          <div className="lp-grid">
            {problems.map((p) => (
              <div key={p.title} className="card-box">
                <span className="icon-circle">
                  <i className={`bi bi-${p.icon}`} aria-hidden="true" />
                </span>
                <h3>{p.title}</h3>
                <p className="lp-muted">{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-band lp-band--card" id="slik-fungerer-det">
        <div className="lp-inner">
          <h2>Slik fungerer det</h2>
          <p className="lp-sub">Tre steg, og du trenger ikke forstå forsikringsspråk.</p>
          <div className="lp-grid">
            {steps.map((s) => (
              <div key={s.title} className="card-box">
                <span className="icon-circle">
                  <i className={`bi bi-${s.icon}`} aria-hidden="true" />
                </span>
                <h3>{s.title}</h3>
                <p className="lp-muted">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-band">
        <div className="lp-inner">
          <h2>Det du får</h2>
          <p className="lp-sub">Alt på ett sted i stedet for en mappe med PDF-er.</p>
          <div className="lp-grid lp-grid--2">
            {features.map((f) => (
              <div key={f.title} className="card-box lp-feature">
                <span className="icon-circle">
                  <i className={`bi bi-${f.icon}`} aria-hidden="true" />
                </span>
                <div>
                  <h3>
                    {f.title}
                    {f.soon && <span className="pill pill--soon">{f.soon}</span>}
                  </h3>
                  <p className="lp-muted">{f.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-band lp-band--card">
        <div className="lp-inner">
          <div className="lp-promise">
            <span className="icon-circle icon-circle--lg">
              <i className="bi bi-shield-check" aria-hidden="true" />
            </span>
            <h2>Vi tjener ikke på dine valg</h2>
            <p className="lp-lead">
              Forsikringsselskapene vinner ikke på at du har full oversikt. Vi gjør det. Derfor er
              Dekket bygget slik:
            </p>
            <ul className="lp-checks">
              {promises.map((text) => (
                <li key={text}>
                  <i className="bi bi-check-circle" aria-hidden="true" />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="lp-band" id="pris">
        <div className="lp-inner">
          <h2>En enkel pris</h2>
          <p className="lp-sub">Én pris, ingen skjulte kostnader.</p>
          <div className="lp-plan">
            <div className="lp-plan-price">39 kr</div>
            <div className="lp-muted">per måned, inkl. mva</div>
            <ul className="lp-checks lp-checks--left">
              {planPoints.map((text) => (
                <li key={text}>
                  <i className="bi bi-check2" aria-hidden="true" />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
            <Link to={startLink} className="cta lp-plan-cta">
              Prøv gratis
            </Link>
            <div className="lp-fine">Gratis mens vi bygger</div>
          </div>
        </div>
      </section>

      <section className="lp-band lp-band--card">
        <div className="lp-inner lp-faq">
          <h2>Vanlige spørsmål</h2>
          {faqs.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="lp-band lp-final">
        <div className="lp-inner">
          <h2>Vit det før du trenger det</h2>
          <p className="lp-sub">Opprett en konto og legg til din første forsikring.</p>
          <Link to={startLink} className="cta">
            Kom i gang
          </Link>
        </div>
      </section>
    </>
  )
}
