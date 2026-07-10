import React from "react";
import { Link } from "react-router-dom";

function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <nav className="stadium px-4 py-3 text-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-black">🏆 Toernooitje</Link>
          <Link to="/login" className="rounded-full bg-white px-4 py-1.5 text-sm font-bold" style={{ color: "var(--accent)" }}>
            Inloggen
          </Link>
        </div>
      </nav>
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-black tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">Laatst bijgewerkt: {updated}</p>
        <div className="prose-sm mt-8 space-y-6 text-slate-700 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-slate-900 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
          {children}
        </div>
        <div className="mt-12 border-t border-slate-200 pt-6 text-sm text-slate-500">
          Vragen hierover? Mail{" "}
          <a href="mailto:info@toernooitje.nl" className="underline" style={{ color: "var(--accent)" }}>
            info@toernooitje.nl
          </a>
          {" · "}
          <Link to="/" className="underline">terug naar de homepage</Link>
        </div>
      </main>
    </div>
  );
}

export function Voorwaarden() {
  return (
    <LegalPage title="Algemene voorwaarden" updated="7 juli 2026">
      <section>
        <h2>1. Wie wij zijn en wat Toernooitje is</h2>
        <p>
          Toernooitje ("wij", "de dienst") is gratis online software voor het organiseren van
          sporttoernooien: deelnemersbeheer, indelingen, speelschema's, live standen,
          scheidsrechterinvoer en online inschrijvingen. Door de dienst te gebruiken ga je akkoord
          met deze voorwaarden.
        </p>
      </section>
      <section>
        <h2>2. Gratis dienst, advertenties en giften</h2>
        <p>
          Toernooitje is gratis. Om de dienst draaiende te houden tonen wij bescheiden
          advertenties op publieke toernooipagina's. Organisatoren kunnen deze advertenties per
          toernooi afkopen en vervangen door eigen sponsoruitingen. Daarnaast accepteren wij
          vrijwillige giften. Giften zijn geen betaling voor een dienst en geven geen recht op
          extra functionaliteit, ondersteuning of beschikbaarheid.
        </p>
      </section>
      <section>
        <h2>3. Gebruik van de dienst</h2>
        <ul>
          <li>Je gebruikt Toernooitje alleen voor legale doeleinden en volgens deze voorwaarden.</li>
          <li>
            Je plaatst geen content die inbreuk maakt op rechten van anderen (waaronder logo's of
            foto's waarvan je de rechten niet bezit), beledigend, discriminerend of anderszins
            onrechtmatig is.
          </li>
          <li>
            Deellinks en invoerlinks (voor scheidsrechters en beheerders) bevatten een
            toegangssleutel. Je bent zelf verantwoordelijk voor het zorgvuldig delen daarvan.
          </li>
          <li>
            Wij mogen content of toernooien verwijderen die deze voorwaarden schenden, en de
            dienst beschermen tegen misbruik (zoals spam of overbelasting).
          </li>
        </ul>
      </section>
      <section>
        <h2>4. Jouw content en gegevens</h2>
        <p>
          Toernooidata die je invoert (teams, spelers, uitslagen, sponsors) blijft van jou. Je
          geeft ons uitsluitend het technische recht die data op te slaan en te tonen voor zover
          nodig om de dienst te leveren — bijvoorbeeld het publiceren van standen op de publieke
          toernooipagina die jij deelt. Hoe wij met persoonsgegevens omgaan staat in de{" "}
          <Link to="/privacy" className="underline">privacyverklaring</Link>.
        </p>
      </section>
      <section>
        <h2>5. Beschikbaarheid en aansprakelijkheid</h2>
        <p>
          Wij doen ons best om de dienst betrouwbaar en beschikbaar te houden, maar Toernooitje
          wordt geleverd "zoals hij is", zonder garanties. Wij zijn niet aansprakelijk voor schade
          door het gebruik of de onbeschikbaarheid van de dienst, verlies van gegevens, of
          fouten in schema's en standen, behoudens opzet of grove schuld. Maak voor belangrijke
          toernooien zelf een kopie van essentiële informatie (bijvoorbeeld een afdruk van het
          schema).
        </p>
      </section>
      <section>
        <h2>6. Wijzigingen</h2>
        <p>
          Wij kunnen de dienst en deze voorwaarden aanpassen. Bij ingrijpende wijzigingen melden
          we dat op de website. Blijf je de dienst gebruiken na een wijziging, dan geldt de nieuwe
          versie.
        </p>
      </section>
      <section>
        <h2>7. Toepasselijk recht</h2>
        <p>
          Op deze voorwaarden is Nederlands recht van toepassing. Geschillen worden voorgelegd
          aan de bevoegde rechter in Nederland.
        </p>
      </section>
    </LegalPage>
  );
}

export function Privacy() {
  return (
    <LegalPage title="Privacyverklaring" updated="7 juli 2026">
      <section>
        <h2>1. Kern in het kort</h2>
        <ul>
          <li>Wij verkopen geen gegevens en gebruiken geen tracking- of advertentiecookies.</li>
          <li>Toernooidata staat standaard alleen lokaal in de browser van de organisator.</li>
          <li>
            Pas als de organisator een toernooi "live" zet of deelt, worden gegevens online
            opgeslagen — en dan alleen wat nodig is voor de publieke toernooipagina.
          </li>
        </ul>
      </section>
      <section>
        <h2>2. Welke gegevens verwerken we?</h2>
        <ul>
          <li>
            <b>Toernooidata</b>: toernooinaam, locaties, teamnamen, spelersnamen, uitslagen,
            schema's en sponsorlogo's. Ingevoerd door de organisator; standaard lokaal opgeslagen
            (localStorage), optioneel gesynchroniseerd naar onze database (Supabase) wanneer het
            toernooi live wordt gezet.
          </li>
          <li>
            <b>Inschrijvingen</b>: team- of spelersnaam en (optioneel) contactpersoon, e-mailadres
            en telefoonnummer. Deze zijn <b>niet publiek</b>: alleen de organisator van het
            toernooi kan ze inzien met zijn beveiligde sleutel.
          </li>
          <li>
            <b>Beheerdersgegevens</b>: naam en e-mailadres van mede-beheerders, alleen zichtbaar
            voor de organisator.
          </li>
        </ul>
        <p>
          Bij publicatie van een toernooi worden e-mailadressen, telefoonnummers en geboortedata
          automatisch <b>weggefilterd</b> uit de publieke gegevens.
        </p>
      </section>
      <section>
        <h2>3. Waarvoor gebruiken we deze gegevens?</h2>
        <p>
          Uitsluitend om de dienst te leveren: het tonen van standen en schema's aan de mensen
          met wie de organisator zijn toernooi deelt, het verwerken van inschrijvingen en het
          laten invoeren van uitslagen. Grondslag onder de AVG: uitvoering van de
          gebruiksovereenkomst en gerechtvaardigd belang (goede werking en beveiliging van de
          dienst).
        </p>
      </section>
      <section>
        <h2>4. Bewaartermijnen</h2>
        <p>
          Lokale data blijft op het apparaat van de organisator tot die het toernooi verwijdert.
          Online gezette toernooien blijven staan tot de organisator ze verwijdert of offline
          haalt; wij kunnen inactieve toernooien na verloop van tijd opschonen.
        </p>
      </section>
      <section>
        <h2>5. Met wie delen we gegevens?</h2>
        <p>
          Online toernooidata wordt gehost bij Supabase (EU-regio waar mogelijk). Verder delen wij
          geen gegevens met derden, tenzij de wet dat vereist. Advertenties op publieke pagina's
          zijn statische uitingen zonder tracking; afgekochte advertentieruimte toont door de
          organisator geüploade sponsorlogo's.
        </p>
      </section>
      <section>
        <h2>6. Cookies en lokale opslag</h2>
        <p>
          Toernooitje gebruikt geen cookies voor tracking of marketing. We gebruiken alleen
          functionele lokale opslag (localStorage/sessionStorage) voor zaken als je toernooien,
          je gekozen team op de live-pagina en instellingen. Daarvoor is geen cookiebanner
          vereist.
        </p>
      </section>
      <section>
        <h2>7. Jouw rechten (AVG)</h2>
        <p>
          Je hebt recht op inzage, rectificatie, verwijdering, beperking, dataportabiliteit en
          bezwaar. Sta je in een toernooi van iemand anders (bijvoorbeeld als speler of
          inschrijver)? Neem dan eerst contact op met de organisator van dat toernooi — die
          beheert de gegevens. Kom je er niet uit, mail ons via{" "}
          <a href="mailto:info@toernooitje.nl" className="underline">info@toernooitje.nl</a>. Je
          kunt ook een klacht indienen bij de Autoriteit Persoonsgegevens.
        </p>
      </section>
      <section>
        <h2>8. Beveiliging</h2>
        <p>
          Schrijftoegang tot toernooien is beveiligd met geheime sleutels; inschrijvingen zijn
          afgeschermd van publieke inzage; verbindingen verlopen via HTTPS. Meld
          beveiligingsproblemen alsjeblieft via{" "}
          <a href="mailto:info@toernooitje.nl" className="underline">info@toernooitje.nl</a>.
        </p>
      </section>
    </LegalPage>
  );
}
