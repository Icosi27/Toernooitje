# 🏆 Toernooitje

Gratis online toernooisoftware voor (voetbal)toernooien, geïnspireerd op Tournify.

## Functies

- **Toernooi-wizard** — naam, wedstrijddagen, locaties en divisies in 3 stappen
- **Toernooivormen**
  - Competitie (één poule, iedereen één keer tegen elkaar)
  - Round Robin (uit én thuis)
  - WK-format (poules + knock-outfase)
  - Champions League-format (poules van 4, nummers 1 & 2 door)
  - Knock-out (met troostfinale)
  - Individuele winnaar (bijv. 4x4 — spelers loten elke ronde nieuwe teams)
  - Of zelf bouwen met losse poules en brackets
- **Deelnemers** — teams (bulk-invoer), spelers, scheidsrechters, beheerders
- **Puntentelling** — punten bij winst/gelijk/verlies, strafschoppen bij KO, instelbare
  rangschikkingscriteria (punten, doelsaldo, doelpunten, onderling resultaat)
- **Schema** — velden toevoegen en automatische planner (teams nooit dubbel ingepland,
  scheidsrechters rouleren), handmatig bij te stellen
- **Resultaten** — uitslagen invullen; standen en brackets werken live bij, winnaars
  stromen automatisch door naar de volgende ronde
- **Presentatie** — publieke toernooiwebsite met standen/schema, diavoorstelling voor
  grote schermen, eigen accentkleur, logo en achtergrond
- **Reclame & sponsors** — de app blijft gratis dankzij bescheiden reclameblokken;
  organisatoren kunnen de reclame per toernooi **afkopen** en er eigen
  sponsorblokken tonen
- **🎁 Gift-knop** — bezoekers kunnen doneren om Toernooitje draaiende te houden
- **Delen & live sync**
  - Deellink zonder account: de complete stand zit gecomprimeerd in de link zelf
    (momentopname)
  - **Live online** via een gratis Supabase-project: deelnemers zien standen live
    op hun eigen telefoon, scheidsrechters vullen uitslagen in via hun eigen
    inloglink, beheerders via een invoerlink — alles werkt direct bij op alle
    schermen
  - Scheidsrechterportaal: alleen de eigen toegewezen wedstrijden, grote
    invoervelden voor mobiel

## Live online zetten (eenmalig, gratis)

1. Maak een gratis project op [supabase.com](https://supabase.com)
2. Plak de inhoud van [`supabase/setup.sql`](supabase/setup.sql) in de SQL Editor en klik **Run**
3. Kopieer bij *Project Settings → API* de **Project URL** en de **anon public** key
4. Plak ze in Toernooitje bij *Presentatie → Delen → Live online* en klik **Zet live**

De app zelf wordt via GitHub Actions automatisch op **GitHub Pages** gezet
(Settings → Pages → Source: *GitHub Actions* eenmalig aanzetten), zodat de
links op elke telefoon werken.

## Ontwikkelen

```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # productie-build in dist/
```

## Techniek

Vite + React + TypeScript + Tailwind CSS v4 + Zustand (opslag in localStorage).
Alle toernooilogica (round robin, standen, brackets, planner) staat in `src/logic/`.
