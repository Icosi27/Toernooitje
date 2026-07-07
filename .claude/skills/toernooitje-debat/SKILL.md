---
name: toernooitje-debat
description: Beoordeel een feature, scherm of idee voor Toernooitje via een paneldebat tussen FE-, UX- en UI-experts en de gebruikersrollen organisator, speler, scheidsrechter en coach. Gebruik bij vragen als "wat vinden gebruikers hiervan", "review dit scherm", "hoe moet feature X eruitzien" of vóór het bouwen van een nieuwe feature.
argument-hint: <feature, scherm of vraag om te bespreken>
---

# Toernooitje-paneldebat

Je organiseert een kort, scherp paneldebat over: **$ARGUMENTS** (geen argument? vraag dan eerst wat er besproken moet worden). Alle output in het Nederlands.

## Context van de app (lees eerst wat relevant is)

Toernooitje is een gratis Tournify-kloon: Vite + React + TypeScript + Tailwind v4 + Zustand
(localStorage) met Supabase-synchronisatie. Verdienmodel: afkoopbare reclameblokken + donatieknop
— dat mag nooit sneuvelen in een voorstel.

Rollen ↔ schermen:

| Rol | Schermen | Bestanden |
|---|---|---|
| Organisator | dashboard: Algemeen/Deelnemers/Indeling/Schema/Presentatie/Resultaten | `src/pages/Dashboard.tsx`, `src/pages/tabs/*` |
| Speler/team | publieke pagina `/live`, `/kijk/:id` (live), `/bekijk` (momentopname), inschrijven `/inschrijven/:id` | `src/pages/Live.tsx`, `src/pages/Inschrijven.tsx` |
| Scheidsrechter | invoerportaal `/scheids/:id/:refId` (mobiel, eigen wedstrijden) | `src/pages/Portal.tsx` |
| Coach | volgt één team over meerdere schermen heen (nu geen eigen scherm!) | — |

Toernooilogica: `src/logic/` (roundrobin, standings, bracket, schedule, formats, individual,
cloud, share). Stijl: classes `card`, `btn-primary`, `btn-outline`, `input`, `label`;
accentkleur via CSS-variabele `--accent` (instelbaar per toernooi); emoji-iconen.

Lees vóór het debat de bestanden die het onderwerp raken, zodat panelleden naar echte code en
echte schermen verwijzen — geen gefantaseerde features.

## Het panel

**Vakexperts** — beoordelen het HOE:
1. **FE-engineer** — datamodel (`src/types.ts`), state/sync-gevolgen (localStorage-limiet,
   Supabase-blob, scores-tabel, deellink-grootte), routes, TypeScript-netheid, bundelgrootte.
2. **UX-ontwerper** — taakflows en frictie: hoeveel klikken op een chaotische toernooiochtend,
   foutbestendigheid (dikke duimen op mobiel langs het veld), lege-staten, feedback na acties.
3. **UI-ontwerper** — visuele consistentie met de bestaande stijl, hiërarchie, leesbaarheid op
   afstand (diavoorstelling op groot scherm!), mobiel eerst voor publieke pagina's,
   accentkleur-gebruik.

**Gebruikersrollen** — beoordelen het WAT:
4. **Organisator** — wil vooraf snel opzetten en op de dag zelf overzicht: wie is er, wie heeft
   betaald, loopt het schema uit, waar vul ik snel een uitslag in?
5. **Speler** — staat langs het veld met een telefoon: wanneer en waar speel ik, hoe staan we,
   wat moet ik winnen om door te gaan?
6. **Scheidsrechter** — heeft 30 seconden tussen twee wedstrijden: grote knoppen, alleen míjn
   wedstrijden, geen kans op invoer bij de verkeerde wedstrijd.
7. **Coach** — volgt één team: alle wedstrijden van dat team op een rij, opstelling/spelers,
   volgende tegenstander en veld.

## Verloop

1. **Openingsronde** — elk panellid (alle 7) geeft in 2-4 zinnen zijn belangrijkste punt over het
   onderwerp: het grootste bezwaar óf de grootste kans, concreet verwijzend naar schermen/code.
2. **Botsing** — benoem de 2-3 echte spanningen die uit de openingsronde komen (bijv. scheidsrechter
   wil minder op het scherm, organisator wil meer controle; FE wil de deellink klein houden, UI wil
   logo's overal). Laat de betrokken panelleden het kort uitvechten en kies per spanning een winnaar
   mét onderbouwing.
3. **Vonnis** — sluit af met:
   - **Aanbevelingen** (genummerd, geprioriteerd): *quick wins* (< 1 uur bouwen) apart van *groter werk*;
   - per aanbeveling: welke bestanden geraakt worden en welk panellid erom vroeg;
   - **Afgewezen ideeën** met één zin waarom;
   - de vraag of je de quick wins direct moet bouwen (bouw pas na akkoord, tenzij de gebruiker al
     opdracht gaf).

Bij een groot onderwerp (heel scherm of nieuwe feature) mag je de zeven perspectieven parallel
uitwerken met de Agent-tool (één agent per panellid, geef elk de relevante bestandspaden mee) en
zelf alleen botsing + vonnis doen. Bij een kleine vraag: alles inline, compact.

Toon: panelleden zijn eerlijk en oneens waar dat hoort — een debat waarin iedereen elkaar gelijk
geeft is mislukt. Maar altijd constructief: elk bezwaar eindigt in een voorstel.
