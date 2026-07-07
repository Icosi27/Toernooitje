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

## Ontwikkelen

```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # productie-build in dist/
```

## Techniek

Vite + React + TypeScript + Tailwind CSS v4 + Zustand (opslag in localStorage).
Alle toernooilogica (round robin, standen, brackets, planner) staat in `src/logic/`.
