import LegalPage, { Fill, LegalSection } from '../components/LegalPage'
import { operator } from '../content/legal'

// Personvernerklæring. DRAFT — must be reviewed by a lawyer (see src/content/legal.js).
// It must always describe what the app ACTUALLY does. Update it when we add a new provider
// (AI, payments, email, analytics) before that feature goes live.
export default function Privacy() {
  return (
    <LegalPage title="Personvernerklæring">
      <LegalSection title="1. Hvem er ansvarlig for opplysningene dine?">
        <p>
          <Fill>{operator.name}</Fill> (org.nr. <Fill>{operator.orgNumber}</Fill>) er
          behandlingsansvarlig for personopplysningene som behandles i Dekket.
        </p>
        <p>
          Spørsmål om personvern kan du sende til <Fill>{operator.email}</Fill>.
        </p>
      </LegalSection>

      <LegalSection title="2. Hvilke opplysninger vi behandler">
        <ul>
          <li>
            <strong>Kontoopplysninger:</strong> e-postadressen din og passordet ditt (passordet
            lagres kryptert, og vi kan ikke lese det).
          </li>
          <li>
            <strong>Dokumentene du laster opp,</strong> og opplysningene du oppgir om dem: navn,
            type forsikring, forsikringsselskap, filnavn, størrelse og tidspunkt.
          </li>
          <li>
            <strong>Innholdet i dokumentene.</strong> Forsikringsdokumenter kan inneholde navn,
            adresse, fødselsnummer, kontonummer, kjøretøy- og eiendomsopplysninger og i noen
            tilfeller opplysninger om helse (for eksempel ved helse-, ulykke- eller
            livsforsikring). Last bare opp det som trengs. Du kan sladde det du ikke ønsker å dele,
            for eksempel fødselsnummer.
          </li>
          <li>
            <strong>Tekniske opplysninger:</strong> IP-adresse og tidspunkt i serverloggene til
            leverandørene våre, som brukes til drift og sikkerhet.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Hvorfor vi behandler dem, og på hvilket grunnlag">
        <ul>
          <li>
            <strong>For å levere tjenesten til deg</strong> (opprette konto, lagre og vise
            dokumentene dine, lage oversikter og analyser). Grunnlag: avtalen med deg
            (personvernforordningen art. 6 nr. 1 b).
          </li>
          <li>
            <strong>Opplysninger om helse</strong> i dokumentene behandler vi bare for å levere
            tjenesten til deg, og basert på ditt uttrykkelige samtykke (art. 9 nr. 2 a), som du gir
            ved å krysse av når du laster opp et dokument. Tidspunktet lagres sammen med dokumentet.
            Du kan trekke samtykket tilbake når som helst ved å slette dokumentet eller kontoen.
          </li>
          <li>
            <strong>Sikkerhet og forebygging av misbruk.</strong> Grunnlag: berettiget interesse
            (art. 6 nr. 1 f).
          </li>
          <li>
            <strong>Regnskap og andre lovkrav</strong>, når betaling er innført. Grunnlag:
            rettslig forpliktelse (art. 6 nr. 1 c).
          </li>
        </ul>
        <p>
          Vi selger ikke opplysningene dine, vi viser ingen annonser, og vi bruker dem ikke til
          markedsføring fra andre.
        </p>
      </LegalSection>

      <LegalSection title="4. Hvem som behandler opplysningene på våre vegne">
        <p>Vi bruker disse leverandørene (databehandlere):</p>
        <ul>
          <li>
            <strong>Supabase:</strong> database, innlogging og lagring av filer. Dataene lagres i
            EU (Frankfurt, Tyskland).
          </li>
          <li>
            <strong>Vercel:</strong> hosting av nettsiden. Behandler tekniske opplysninger som
            IP-adresse.
          </li>
          <li>
            <strong>[Når analysen lanseres: AI-leverandør]</strong> Innholdet i dokumentene du ber
            om analyse av, sendes til en leverandør av KI-modeller for å lage analysen.
            Leverandøren skal ikke bruke innholdet til å trene egne modeller.
          </li>
          <li>
            <strong>[Når betaling innføres: betalingsleverandør]</strong> Håndterer
            betalingsopplysningene dine. Vi lagrer ikke kortnummer selv.
          </li>
        </ul>
        <p>
          Vi har databehandleravtaler med leverandørene. Noen av dem er amerikanske selskaper eller
          har underleverandører utenfor EØS. Overføringer skjer på grunnlag av EU-kommisjonens
          standardavtaler og/eller EU–US Data Privacy Framework.
        </p>
      </LegalSection>

      <LegalSection title="5. Hvor lenge vi lagrer opplysningene">
        <ul>
          <li>Vi lagrer opplysningene dine så lenge du har en konto hos oss.</li>
          <li>
            Du kan slette enkeltdokumenter under «Mine forsikringer», og hele kontoen under «Konto».
            Da fjernes både filene, oppføringene og kontoen din med en gang.
          </li>
          <li>
            Betalingsopplysninger kan vi være pålagt å oppbevare i fem år etter bokføringsloven.
          </li>
          <li>
            Sikkerhetskopier hos leverandørene overskrives automatisk innen kort tid etter sletting.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Rettighetene dine">
        <p>Du har rett til å:</p>
        <ul>
          <li>få innsyn i opplysningene vi har om deg og få en kopi,</li>
          <li>få rettet feil, og få slettet opplysninger,</li>
          <li>begrense behandlingen eller protestere mot den,</li>
          <li>få utlevert opplysningene dine i et maskinlesbart format (dataportabilitet),</li>
          <li>trekke tilbake samtykke du har gitt.</li>
        </ul>
        <p>
          Kontakt oss på <Fill>{operator.email}</Fill>. Du kan også klage til{' '}
          <a href="https://www.datatilsynet.no" target="_blank" rel="noreferrer">
            Datatilsynet
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="7. Sikkerhet">
        <p>
          Filene dine lagres i en privat lagringsplass, og tilgangsregler i databasen sørger for at
          hver bruker bare kan se sine egne dokumenter. All kommunikasjon mellom deg og tjenesten er
          kryptert (HTTPS). Ingen tjeneste er likevel helt sikker, så vi anbefaler at du ikke laster
          opp mer enn du trenger.
        </p>
      </LegalSection>

      <LegalSection title="8. Informasjonskapsler og sporing">
        <p>
          Vi bruker bare det som er nødvendig for at du skal kunne være innlogget (en liten
          innloggingsøkt som lagres i nettleseren din). Vi bruker ingen sporings-, analyse- eller
          markedsføringsverktøy, og laster ingen skrifttyper eller annet innhold fra tredjeparter
          når du besøker siden. Derfor har vi ikke noe samtykkebanner.
        </p>
      </LegalSection>

      <LegalSection title="9. Endringer">
        <p>
          Vi oppdaterer denne erklæringen når tjenesten endres, blant annet når vi tar i bruk nye
          leverandører. Ved vesentlige endringer varsler vi deg på e-post.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
