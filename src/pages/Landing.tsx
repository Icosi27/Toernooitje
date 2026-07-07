import { Link } from "react-router-dom";
import { DONATE_URL } from "../components/monetization";

const FEATURES = [
  {
    icon: "🗂️",
    title: "Elke toernooivorm",
    text: "Competitie, WK-format met poules en knock-out, Champions League, Round Robin of een individueel 4x4-toernooi — in een paar klikken opgezet.",
  },
  {
    icon: "⚡",
    title: "Automatische planner",
    text: "Wedstrijden worden slim over je velden verdeeld: teams nooit dubbel ingepland, scheidsrechters nooit op twee velden tegelijk. Uitloop? Schuif alles in één klik op.",
  },
  {
    icon: "📱",
    title: "Live standen op elke telefoon",
    text: "Deel één link en iedereen kijkt live mee: standen, speelschema en de bracket. Spelers kiezen hun eigen team en zien direct wanneer en waar ze moeten spelen.",
  },
  {
    icon: "🦺",
    title: "Scheidsrechterportaal",
    text: "Elke scheidsrechter krijgt een eigen link met alleen zíjn wedstrijden en grote invoerknoppen. Uitslagen staan binnen een seconde op alle schermen.",
  },
  {
    icon: "📝",
    title: "Online inschrijven",
    text: "Teams of spelers melden zich aan via een inschrijfpagina. Jij accepteert met één klik en de deelnemerslijst vult zichzelf.",
  },
  {
    icon: "🖥️",
    title: "Presentatiemodus",
    text: "Hang een scherm in de kantine: donkere weergave met grote letters die automatisch wisselt tussen standen en schema.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* navigatie */}
      <nav className="accent-header sticky top-0 z-40 px-4 py-3 text-white">
        <div className="mx-auto flex max-w-5xl items-center gap-6">
          <Link to="/" className="flex items-center gap-2 text-lg font-black tracking-tight">
            🏆 Toernooitje
          </Link>
          <div className="ml-auto hidden items-center gap-5 text-sm font-medium sm:flex">
            <a href="#functies" className="opacity-90 hover:opacity-100">Functies</a>
            <a href="#missie" className="opacity-90 hover:opacity-100">Onze missie</a>
            <a href="#over" className="opacity-90 hover:opacity-100">Over ons</a>
            <a href="#contact" className="opacity-90 hover:opacity-100">Contact</a>
          </div>
          <Link
            to="/app"
            className="rounded-full bg-white px-4 py-1.5 text-sm font-bold"
            style={{ color: "var(--accent)" }}
          >
            Inloggen
          </Link>
        </div>
      </nav>

      {/* hero */}
      <header className="accent-header px-4 pb-20 pt-16 text-white">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
            Organiseer je voetbaltoernooi.
            <br />
            Gratis. Voor altijd.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg opacity-90">
            Toernooitje regelt je poules, speelschema, live standen en scheidsrechters — zodat jij
            je kunt bezighouden met het toernooi zelf, niet met Excel.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/nieuw"
              className="rounded-full bg-white px-6 py-3 font-bold shadow-lg"
              style={{ color: "var(--accent)" }}
            >
              Start gratis een toernooi
            </Link>
            <Link
              to="/app"
              className="rounded-full border border-white/60 px-6 py-3 font-semibold text-white hover:bg-white/10"
            >
              Inloggen
            </Link>
          </div>
          <p className="mt-4 text-xs opacity-70">
            Geen account of creditcard nodig · direct aan de slag
          </p>
        </div>
      </header>

      {/* functies */}
      <section id="functies" className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="text-center text-3xl font-black tracking-tight">Alles wat je toernooi nodig heeft</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-slate-600">
          Van eerste opzet tot de finale op het grote scherm.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-6">
              <div className="mb-3 text-3xl">{f.icon}</div>
              <h3 className="font-bold">{f.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* doel & missie */}
      <section id="missie" className="bg-slate-50 px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-black tracking-tight">Ons doel &amp; onze missie</h2>
          <div className="mt-6 space-y-5 text-slate-700">
            <p>
              <b>Het doel</b> van Toernooitje is simpel: elk sportclubje, elke school en elke
              vriendengroep moet een professioneel toernooi kunnen organiseren — zonder
              abonnement, zonder betaalmuur voor basisfuncties en zonder technische kennis.
            </p>
            <p>
              <b>Onze missie:</b> toernooisoftware hoort net zo toegankelijk te zijn als het spel
              zelf. Sport verbindt, en de organisatie ervan mag nooit stranden op dure licenties.
              Daarom is Toernooitje gratis en blijft dat ook. De app draait op bescheiden
              advertenties, die organisatoren kunnen <b>afkopen</b> om er hun eigen clubsponsoren
              te tonen, en op vrijwillige <b>giften</b> van gebruikers die de app een warm hart
              toedragen.
            </p>
            <p>
              Geen verborgen kosten, geen doorverkochte data, geen kunstmatige limieten. Wat je
              vandaag gratis gebruikt, blijft gratis.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={DONATE_URL}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-amber-400 px-5 py-2.5 font-semibold text-amber-950 shadow hover:bg-amber-300"
            >
              🎁 Steun Toernooitje met een gift
            </a>
          </div>
        </div>
      </section>

      {/* over ons */}
      <section id="over" className="mx-auto max-w-3xl px-4 py-16">
        <h2 className="text-3xl font-black tracking-tight">Over ons</h2>
        <div className="mt-6 space-y-5 text-slate-700">
          <p>
            Toernooitje is ontstaan langs de lijn: bij het organiseren van een clubtoernooi bleek
            steeds weer dat goede toernooisoftware óf duur, óf ingewikkeld, óf allebei was. Dus
            bouwden we het zelf — precies zoals een vrijwilliger het nodig heeft op een drukke
            zaterdagochtend met zestien teams, vier velden en een luidruchtige kantine.
          </p>
          <p>
            We zijn een klein, onafhankelijk team uit Nederland. We bouwen Toernooitje in de
            avonduren en weekenden, met input van de organisatoren, scheidsrechters, coaches en
            spelers die de app elke week gebruiken. Feedback of een idee? We horen het graag —
            elke functie in de app is er ooit gekomen omdat iemand erom vroeg.
          </p>
        </div>
      </section>

      {/* contact */}
      <section id="contact" className="bg-slate-50 px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-black tracking-tight">Contact</h2>
          <p className="mt-4 text-slate-700">
            Vragen, feedback of hulp nodig bij je toernooi?
          </p>
          <ul className="mt-4 space-y-2 text-slate-700">
            <li>
              📧 E-mail:{" "}
              <a href="mailto:info@toernooitje.nl" className="underline" style={{ color: "var(--accent)" }}>
                info@toernooitje.nl
              </a>
            </li>
            <li>
              🐙 GitHub:{" "}
              <a
                href="https://github.com/Icosi27/Toernooitje"
                target="_blank"
                rel="noreferrer"
                className="underline"
                style={{ color: "var(--accent)" }}
              >
                github.com/Icosi27/Toernooitje
              </a>
            </li>
          </ul>
        </div>
      </section>

      {/* footer */}
      <footer className="border-t border-slate-200 px-4 py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 text-center text-sm text-slate-500">
          <div className="flex items-center gap-2 font-black text-slate-700">🏆 Toernooitje</div>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            <Link to="/voorwaarden" className="hover:underline">Algemene voorwaarden</Link>
            <Link to="/privacy" className="hover:underline">Privacyverklaring</Link>
            <a href="#over" className="hover:underline">Over ons</a>
            <a href="#contact" className="hover:underline">Contact</a>
            <a href={DONATE_URL} target="_blank" rel="noreferrer" className="hover:underline">Doneren</a>
          </div>
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} Toernooitje — gratis toernooisoftware, mede mogelijk
            gemaakt door advertenties en giften.
          </p>
        </div>
      </footer>
    </div>
  );
}
