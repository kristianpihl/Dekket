import { Link } from 'react-router-dom'
import LegalPage, { Fill, LegalSection } from '../components/LegalPage'
import { operator, priceText } from '../content/legal'

// Vilkår for bruk. DRAFT — must be reviewed by a lawyer (see src/content/legal.js).
export default function Terms() {
  return (
    <LegalPage title="Vilkår for bruk av Dekket">
      <LegalSection title="1. Om Dekket">
        <p>
          Dekket er en digital tjeneste som hjelper deg å samle forsikringsdokumentene dine og få
          oversikt over dem. Tjenesten drives av <Fill>{operator.name}</Fill> (org.nr.{' '}
          <Fill>{operator.orgNumber}</Fill>), heretter «Dekket» eller «vi».
        </p>
        <p>
          Dekket er <strong>ikke</strong> et forsikringsselskap, en forsikringsformidler eller en
          rådgiver. Vi selger ikke forsikring, tar ingen provisjon, og vi gir ikke personlig
          rådgivning om hvilke forsikringer du bør ha, kjøpe, bytte eller si opp.
        </p>
      </LegalSection>

      <LegalSection title="2. Du har ansvaret">
        <div className="legal-callout">
          <p>
            <strong>Dekket er en hjelper. Ansvaret for at du er dekket er ditt.</strong>
          </p>
          <ul>
            <li>
              Du er selv ansvarlig for at du til enhver tid har den forsikringsdekningen du
              trenger.
            </li>
            <li>
              Du må selv lese og sette deg inn i forsikringsproduktene dine: forsikringsbevis,
              vilkår og endringer. Dekket gjør det enklere, men erstatter det ikke.
            </li>
            <li>
              Det er forsikringsavtalen din og forsikringsselskapet som avgjør hva du er dekket for
              og om du har krav på erstatning. Er du i tvil, kontakt forsikringsselskapet,
              sameiet, arbeidsgiveren din eller en rådgiver.
            </li>
            <li>
              Du må selv holde dokumentene dine oppdatert. Vi kjenner bare til det du har lastet
              opp.
            </li>
            <li>
              Ikke si opp, endre eller unnlate å tegne en forsikring bare på grunnlag av det du ser
              i Dekket.
            </li>
          </ul>
        </div>
      </LegalSection>

      <LegalSection title="3. Hva Dekket kan og ikke kan">
        <p>
          Oversikter, sammendrag, statuser, analyser og andre resultater i Dekket er veiledende.
          De kan være ufullstendige, utdaterte eller feil, for eksempel fordi dokumenter mangler,
          har utløpt eller er lest feil. Deler av tjenesten kan bruke kunstig intelligens (KI),
          som kan gjøre feil.
        </p>
        <p>
          Vi gir ingen garanti for at informasjonen er riktig, fullstendig eller oppdatert, eller
          at tjenesten er tilgjengelig uten avbrudd.
        </p>
      </LegalSection>

      <LegalSection title="4. Vårt ansvar">
        <p>
          Så langt loven tillater, er Dekket ikke ansvarlig for tap eller kostnader som følge av at
          du har stolt på informasjon i tjenesten. Det gjelder blant annet manglende dekning,
          avslått eller redusert erstatning, unødvendig eller dobbel forsikring, og oversette
          frister eller fornyelser. Vi er heller ikke ansvarlige for feil eller mangler i
          dokumenter fra forsikringsselskaper eller andre.
        </p>
        <p>
          Dette gjelder ikke dersom vi har handlet forsettlig eller grovt uaktsomt, og det
          begrenser ikke rettigheter du har som forbruker som ikke kan fravikes ved avtale.
        </p>
      </LegalSection>

      <LegalSection title="5. Konto og bruk">
        <ul>
          <li>Du må være minst 18 år og kan ha én konto. Hold passordet ditt hemmelig.</li>
          <li>
            Last bare opp dokumenter du har rett til å bruke. Dokumenter som gjelder andre
            personer, for eksempel ektefelle eller samboer, laster du bare opp hvis de er kjent
            med det og har sagt ja.
          </li>
          <li>
            Du skal ikke bruke tjenesten til noe ulovlig, forsøke å omgå sikkerheten eller
            overbelaste systemet.
          </li>
          <li>Vi kan stenge kontoer som bryter disse vilkårene.</li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Dokumentene dine">
        <p>
          Du beholder alle rettigheter til dokumentene du laster opp. Du gir oss rett til å lagre og
          behandle dem utelukkende for å levere tjenesten til deg, slik det står i{' '}
          <Link to="/personvern">personvernerklæringen</Link>. Du kan slette dokumentene dine når som
          helst.
        </p>
      </LegalSection>

      <LegalSection title="7. Pris og betaling">
        <p>
          Dekket er gratis å prøve mens vi bygger tjenesten. Når betaling innføres, koster
          abonnementet {priceText}. Vi varsler deg i forkant og belaster deg først når du aktivt har
          valgt å fortsette.
        </p>
        <p>
          Det er ingen binding. Du kan si opp når som helst, og oppsigelsen gjelder ut den perioden
          du har betalt for.
        </p>
      </LegalSection>

      <LegalSection title="8. Endringer">
        <p>
          Vi utvikler Dekket hele tiden og kan endre eller fjerne funksjoner. Ved vesentlige
          endringer i disse vilkårene varsler vi deg på e-post i god tid før de trer i kraft.
        </p>
      </LegalSection>

      <LegalSection title="9. Avslutning">
        <p>
          Du kan avslutte og slette kontoen din når som helst under «Konto» i appen. Alle
          dokumentene og kontoopplysningene dine slettes da for godt. Du kan også kontakte oss på{' '}
          <Fill>{operator.email}</Fill>. Vi behandler dataene dine slik det står i
          personvernerklæringen.
        </p>
      </LegalSection>

      <LegalSection title="10. Lovvalg og tvister">
        <p>
          Norsk rett gjelder. Hvis du er uenig med oss, ta først kontakt, så prøver vi å løse det.
          Som forbruker kan du også ta saken til Forbrukertilsynet eller Forbrukerrådet.
        </p>
      </LegalSection>

      <LegalSection title="11. Kontakt">
        <p>
          <Fill>{operator.name}</Fill>
          <br />
          <Fill>{operator.address}</Fill>
          <br />
          <Fill>{operator.email}</Fill>
        </p>
      </LegalSection>
    </LegalPage>
  )
}
