import type { Division, ID, ScoringConfig } from "../types";
import { qualifyingRanks } from "./resolve";
import { isPlayed, pouleStandings } from "./standings";

const pts = (n: number) => `${n} punt${n === 1 ? "" : "en"}`;

/**
 * Wat staat er voor dit team op het spel in de groepsfase? Vertaalt de stand
 * (positie, punten, doorgangsplekken) naar één zin voor langs het veld —
 * de spanning zit al in de data, dit zet 'm in woorden.
 */
export function qualificationScenario(
  d: Division,
  teamId: ID,
  scoring: ScoringConfig
): string | null {
  for (const s of d.stages) {
    if (s.type !== "poules") continue;
    for (const p of s.poules) {
      if (!p.teamIds.includes(teamId)) continue;
      const qual = qualifyingRanks(d, p.id);
      const maxQual = qual.length > 0 ? Math.max(...qual) : 0;
      if (maxQual === 0 || p.matches.length === 0) return null;

      const rows = pouleStandings(p, scoring);
      const idx = rows.findIndex((r) => r.teamId === teamId);
      if (idx < 0) return null;
      const pos = idx + 1;

      if (p.matches.every(isPlayed)) {
        return pos <= maxQual
          ? `Eindstand groepsfase: ${pos}e — jullie gaan door naar de knock-outfase! 🎉`
          : `Eindstand groepsfase: ${pos}e — top ${maxQual} gaat door.`;
      }

      const remaining = p.matches.filter(
        (m) =>
          !isPlayed(m) &&
          ((m.a.kind === "team" && m.a.teamId === teamId) ||
            (m.b.kind === "team" && m.b.teamId === teamId))
      ).length;
      const rest = remaining > 0 ? ` · nog ${remaining} wedstrijd${remaining === 1 ? "" : "en"}` : "";
      const my = rows[idx];

      if (pos <= maxQual) {
        const chaser = rows[maxQual]; // eerste team ónder de streep
        const lead = chaser ? my.points - chaser.points : 0;
        const detail = !chaser
          ? ""
          : lead > 0
            ? ` — ${pts(lead)} voor op nr. ${maxQual + 1}`
            : ` — gelijk in punten met nr. ${maxQual + 1}`;
        return `Jullie staan ${pos}e${detail}. Top ${maxQual} gaat door${rest}.`;
      }

      const target = rows[maxQual - 1];
      const gap = target.points - my.points;
      const detail =
        gap === 0 ? `gelijk in punten met nr. ${maxQual}` : `${pts(gap)} achter nr. ${maxQual}`;
      return `Jullie staan ${pos}e, ${detail}. Top ${maxQual} gaat door${rest}.`;
    }
  }
  return null;
}
