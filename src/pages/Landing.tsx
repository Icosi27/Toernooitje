import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DONATE_URL } from "../components/monetization";
import { Confetti, Trophy, useReveal } from "../components/decor";

/** Demo-scorebord dat echt "speelt": scores lopen op, wissel van wedstrijd. */
const DEMO: [string, string][] = [
  ["FC Zonnestraal", "De Blauwe Leeuwen"],
  ["VV Kanjers", "SC De Toekomst"],
  ["De Groene Ster", "FC Vuurpijl"],
];

function LiveScoreboard() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick((x) => x + 1), 1800);
    return () => clearInterval(iv);
  }, []);
  const phase = tick % 8; // 0..5 spelen, 6-7 afgelopen
  const matchIdx = Math.floor(tick / 8) % DEMO.length;
  const [home, away] = DEMO[matchIdx];
  const scoreA = Math.min(3, Math.floor(phase / 2));
  const scoreB = Math.min(1, Math.floor(phase / 5));
  const done = phase >= 6;

  return (
    <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-md">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-widest text-white/70">
        <span>Poule A · Veld 2</span>
        {done ? (
          <span className="rounded-full bg-white/20 px-2 py-0.5">Afgelopen</span>
        ) : (
          <span className="flex items-center gap-1.5 text-red-300">
            <span className="live-dot inline-block h-2 w-2 rounded-full bg-red-400" /> LIVE
          </span>
        )}
      </div>
      <div className="mt-4 space-y-3">
        {[
          [home, scoreA],
          [away, scoreB],
        ].map(([name, score], i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <span className="truncate font-semibold text-white">{name}</span>
            <span
              key={`${matchIdx}-${i}-${score}`}
              className="score min-w-9 rounded-lg bg-white/15 px-2 py-1 text-center text-2xl font-black text-amber-300"
            >
              {score}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full bg-amber-400 transition-all duration-1000"
          style={{ width: `${((phase + 1) / 8) * 100}%` }}
        />
      </div>
      <p className="mt-3 text-center text-[11px] text-white/50">
        Zo ziet je publiek het — live, op elk scherm
      </p>
    </div>
  );
}

const TICKER = [
  "09:20 · Veld 1 · FC Zonnestraal 3–1 De Blauwe Leeuwen",
  "09:20 · Veld 2 · VV Kanjers 0–0 SC De Toekomst",
  "09:40 · Veld 1 · De Groene Ster 2–2 FC Vuurpijl",
  "KWARTFINALE · 10:15 · Winnaar A — Nr. 2 Poule B",
  "🏆 Finale om 14:30 op het hoofdveld",
  "📣 De Sportkantine — koffie staat klaar",
];

function Ticker() {
  const items = [...TICKER, ...TICKER];
  return (
    <div className="overflow-hidden border-y border-white/10 bg-black/30 py-2">
      <div className="ticker gap-10">
        {items.map((t, i) => (
          <span key={i} className="score whitespace-nowrap text-sm text-white/70">
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ================= inhoud ================= */

const FEATURES = [
  { icon: "🗂️", title: "Elke toernooivorm", text: "Poules, WK-format, Champions League, knock-out, Round Robin of individueel 4x4 — in drie klikken opgezet." },
  { icon: "⚡", title: "Slimme planner", text: "Teams nooit dubbel ingepland, scheidsrechters nooit op twee velden. Uitloop? Schuif alles in één klik op." },
  { icon: "📱", title: "Live op elke telefoon", text: "Eén linkje in de groepsapp en iedereen kijkt live mee. Spelers kiezen hun team en zien direct: hoe laat, welk veld, tegen wie." },
  { icon: "🦺", title: "Scheidsrechterportaal", text: "Elke scheids een eigen link met alleen zíjn wedstrijden en grote invoerknoppen. Uitslag binnen een seconde overal zichtbaar." },
  { icon: "📝", title: "Online inschrijven", text: "Teams melden zichzelf aan. Jij accepteert met één klik en de deelnemerslijst vult zichzelf." },
  { icon: "🖥️", title: "Kantine-modus", text: "Groot donker scherm met automatische diavoorstelling van standen en schema. Ziet eruit als de Champions League." },
];

const STEPS = [
  { nr: "1", title: "Zet op", text: "Naam, velden, teams. De wizard loodst je er in twee minuten doorheen." },
  { nr: "2", title: "Kies je vorm", text: "Poules + knock-out? Competitie? De indeling en het schema rollen er vanzelf uit." },
  { nr: "3", title: "Ga live", text: "Deel de link. Standen, uitslagen en de bracket lopen live mee op elk scherm." },
];

export default function Landing() {
  useReveal();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* navigatie */}
      <nav className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-6">
          <Link to="/" className="flex items-center gap-2 text-lg font-black tracking-tight">
            🏆 Toernooitje
          </Link>
          <div className="ml-auto hidden items-center gap-6 text-sm font-medium text-slate-300 sm:flex">
            <a href="#functies" className="hover:text-white">Functies</a>
            <a href="#werkwijze" className="hover:text-white">Zo werkt het</a>
            <a href="#missie" className="hover:text-white">Missie</a>
            <a href="#contact" className="hover:text-white">Contact</a>
          </div>
          <Link to="/login" className="text-sm font-semibold text-slate-300 hover:text-white">
            Inloggen
          </Link>
          <Link
            to="/registreren"
            className="rounded-full bg-amber-400 px-4 py-1.5 text-sm font-bold text-amber-950 shadow-lg shadow-amber-400/25 transition hover:bg-amber-300"
          >
            Registreren
          </Link>
        </div>
      </nav>

      {/* hero: stadion bij avond */}
      <header className="stadium-night relative overflow-hidden">
        <div className="beam left-[8%]" style={{ animationDelay: "-2s" }} />
        <div className="beam right-[8%]" style={{ animationDelay: "-6s", animationDuration: "11s" }} />
        <Confetti />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-24 pt-20 lg:grid-cols-2">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-amber-300">
              <span className="live-dot h-2 w-2 rounded-full bg-amber-400" />
              100% gratis toernooisoftware
            </p>
            <h1 className="text-5xl font-black leading-[1.05] tracking-tight sm:text-6xl">
              Jouw toernooi.
              <br />
              <span className="grad-text">Champions League-waardig.</span>
            </h1>
            <p className="mt-6 max-w-md text-lg text-slate-300">
              Poules, speelschema's, live standen en een scorebord voor in de kantine.
              Opgezet in twee minuten, gevolgd door iedereen langs de lijn.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                to="/registreren"
                className="rounded-full bg-amber-400 px-7 py-3.5 font-black text-amber-950 shadow-xl shadow-amber-400/30 transition hover:-translate-y-0.5 hover:bg-amber-300"
              >
                Registreer als organisator
              </Link>
              <Link to="/nieuw" className="font-semibold text-slate-300 underline-offset-4 hover:text-white hover:underline">
                of start direct zonder account →
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-8 gap-y-2 text-sm text-slate-400">
              <span>✓ Geen creditcard</span>
              <span>✓ Onbeperkt teams</span>
              <span>✓ Live in 1 minuut</span>
            </div>
          </div>
          <div className="relative flex items-center justify-center">
            <div className="absolute -top-6 right-6 hidden sm:block">
              <Trophy size={150} />
            </div>
            <LiveScoreboard />
          </div>
        </div>
        <Ticker />
      </header>

      {/* functies */}
      <section id="functies" className="mx-auto max-w-6xl px-4 py-24">
        <div className="reveal text-center">
          <h2 className="text-4xl font-black tracking-tight">Alles voor de perfecte toernooidag</h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-400">
            Van de eerste opzet tot de beker in de lucht.
          </p>
        </div>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="reveal lift rounded-2xl border border-white/10 bg-white/5 p-7"
              style={{ transitionDelay: `${(i % 3) * 90}ms` }}
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-400/15 text-2xl">
                {f.icon}
              </div>
              <h3 className="text-lg font-bold text-white">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* zo werkt het */}
      <section id="werkwijze" className="border-y border-white/10 bg-white/[.03] px-4 py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="reveal text-center text-4xl font-black tracking-tight">Van nul naar aftrap in drie stappen</h2>
          <div className="mt-14 grid gap-10 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.nr} className="reveal relative text-center" style={{ transitionDelay: `${i * 120}ms` }}>
                <div className="shine mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-400 text-3xl font-black text-amber-950">
                  {s.nr}
                </div>
                <h3 className="mt-5 text-lg font-bold">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{s.text}</p>
              </div>
            ))}
          </div>
          <div className="reveal mt-14 text-center">
            <Link
              to="/nieuw"
              className="inline-block rounded-full border border-amber-400/50 px-7 py-3 font-bold text-amber-300 transition hover:bg-amber-400/10"
            >
              Probeer het nu — het kost letterlijk niets
            </Link>
          </div>
        </div>
      </section>

      {/* missie */}
      <section id="missie" className="stadium px-4 py-24">
        <div className="mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-[auto_1fr]">
          <div className="reveal mx-auto">
            <Trophy size={170} />
          </div>
          <div className="reveal">
            <h2 className="text-4xl font-black tracking-tight text-white">
              Sport verbindt. Software mag dat niet verpesten.
            </h2>
            <p className="mt-5 max-w-2xl text-lg text-white/85">
              Ons doel: elk clubje, elke school en elke vriendengroep verdient een professioneel
              toernooi — zonder abonnement, zonder betaalmuur, zonder gedoe. Daarom is Toernooitje
              gratis en blijft dat. De app draait op bescheiden advertenties (die organisatoren
              kunnen <b>afkopen</b> voor hun eigen clubsponsoren) en op giften van mensen die de
              app een warm hart toedragen.
            </p>
            <p className="mt-4 text-white/70">
              Geen verborgen kosten. Geen doorverkochte data. Geen kunstmatige limieten.
            </p>
            <a
              href={DONATE_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-7 inline-block rounded-full bg-amber-400 px-6 py-3 font-bold text-amber-950 shadow-lg transition hover:-translate-y-0.5 hover:bg-amber-300"
            >
              🎁 Steun Toernooitje met een gift
            </a>
          </div>
        </div>
      </section>

      {/* over ons */}
      <section id="over" className="mx-auto max-w-3xl px-4 py-24">
        <h2 className="reveal text-4xl font-black tracking-tight">Ontstaan langs de lijn</h2>
        <div className="reveal mt-6 space-y-5 text-lg leading-relaxed text-slate-300">
          <p>
            Toernooitje is geboren op een zaterdagochtend met zestien jeugdteams, vier velden, een
            haperende Excel en een printer zonder inkt. Goede toernooisoftware bleek duur,
            ingewikkeld of allebei — dus bouwden we het zelf, precies zoals een vrijwilliger het
            nodig heeft.
          </p>
          <p>
            We zijn een klein, onafhankelijk team uit Nederland en bouwen 's avonds en in het
            weekend verder, met feedback van de organisatoren, scheidsrechters en coaches die de
            app elke week gebruiken. Elke functie is er gekomen omdat iemand er langs de lijn om
            vroeg.
          </p>
        </div>
      </section>

      {/* slot-CTA */}
      <section className="relative overflow-hidden border-t border-white/10 px-4 py-24 text-center">
        <Confetti count={16} />
        <div className="reveal relative">
          <h2 className="text-4xl font-black tracking-tight sm:text-5xl">Klaar voor de aftrap?</h2>
          <p className="mx-auto mt-4 max-w-md text-slate-400">
            Over twee minuten staat je toernooi. Over een uur volgt het hele sportpark hem live.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/registreren"
              className="rounded-full bg-amber-400 px-8 py-4 text-lg font-black text-amber-950 shadow-xl shadow-amber-400/30 transition hover:-translate-y-0.5 hover:bg-amber-300"
            >
              🏆 Start je toernooi
            </Link>
          </div>
        </div>
      </section>

      {/* footer */}
      <footer id="contact" className="border-t border-white/10 px-4 py-12">
        <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-3">
          <div>
            <div className="flex items-center gap-2 font-black">🏆 Toernooitje</div>
            <p className="mt-2 text-sm text-slate-400">
              Gratis toernooisoftware, mede mogelijk gemaakt door advertenties en giften.
            </p>
          </div>
          <div className="text-sm">
            <h3 className="mb-3 font-bold text-slate-200">Juridisch</h3>
            <ul className="space-y-2 text-slate-400">
              <li><Link to="/voorwaarden" className="hover:text-white">Algemene voorwaarden</Link></li>
              <li><Link to="/privacy" className="hover:text-white">Privacyverklaring</Link></li>
            </ul>
          </div>
          <div className="text-sm">
            <h3 className="mb-3 font-bold text-slate-200">Contact</h3>
            <ul className="space-y-2 text-slate-400">
              <li>
                <a href="mailto:info@toernooitje.nl" className="hover:text-white">info@toernooitje.nl</a>
              </li>
              <li>
                <a href="https://github.com/Icosi27/Toernooitje" target="_blank" rel="noreferrer" className="hover:text-white">
                  GitHub
                </a>
              </li>
              <li>
                <a href={DONATE_URL} target="_blank" rel="noreferrer" className="hover:text-white">Doneren</a>
              </li>
            </ul>
          </div>
        </div>
        <p className="mt-10 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Toernooitje
        </p>
      </footer>
    </div>
  );
}
