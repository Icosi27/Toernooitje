---
name: toernooitje-test
description: Draai de volledige Toernooitje-testsuite (logica + app-rooktests) en de productie-build, en rapporteer de uitkomst. Gebruik bij "draai de tests", "werkt alles nog", vóór een push/release, of na grotere wijzigingen.
argument-hint: (optioneel) "fix" om gevonden fouten direct te repareren
---

# Toernooitje testen

Voer uit in de projectroot (`C:\Mijn projecten\Toernooitje`), in deze volgorde:

1. `npm test` — vitest draait alle tests in `src/**/*.test.{ts,tsx}`:
   - **Logica** (`src/logic/*.test.ts`): round-robin (cirkelmethode, bye, dubbel),
     standen (puntentelling + tiebreak-criteria incl. onderling resultaat), brackets
     (rondes, troostfinale, kruislingse seeding), doorstroom/resolve (winnaar/verliezer,
     pouleRank, kwalificatieplekken), planner (geen team of scheidsrechter dubbel geboekt,
     opschuiven), individueel 4x4 (loting, klassement), formats en share/privacy
     (publicView lekt geen e-mails of sleutels).
   - **Store** (`src/store.test.ts`): aanmaken, immutable updaten, verwijderen.
   - **App-rooktests** (`src/app.test.tsx`): Landing, Auth, Wizard, juridische
     pagina's en Live-pagina renderen met hun kerninhoud.
2. `npm run build` — TypeScript-check + productie-build.

## Rapportage

Meld in het Nederlands, kort:
- ✅/❌ per stap, aantal geslaagde/gefaalde tests en de duur;
- bij falen: per gefaalde test het bestand + testnaam + één zin over de oorzaak
  (assertie-uitkomst), en of het een **product-bug** of een **verouderde test** lijkt —
  dat onderscheid is de kern van het rapport;
- geen volledige stacktraces plakken, alleen de relevante regel.

## Bij falen

- Is `$ARGUMENTS` gelijk aan `fix` (of vroeg de gebruiker om te repareren): repareer de
  oorzaak — de product-code als het een echte bug is, de test alleen als het gedrag
  aantoonbaar bewust veranderd is — en draai daarna beide stappen opnieuw tot alles groen is.
- Anders: alleen rapporteren en een concreet reparatievoorstel doen, niets wijzigen.

## Nieuwe logica?

Als er sinds de laatste run nieuwe bestanden in `src/logic/` zijn zonder bijbehorende
`.test.ts`, benoem dat in het rapport als dekkingsgat (niet automatisch tests schrijven,
alleen signaleren).
