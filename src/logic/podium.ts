import type { Division, ID, ScoringConfig } from "../types";
import { resolveSlot, winnerOf } from "./resolve";
import { isPlayed, pouleStandings } from "./standings";

export interface PodiumEntry {
  place: number;
  teamId: ID;
}

/**
 * Eindklassement van een divisie, zodra dat bepaald is — voor de
 * prijsuitreiking en de kijkers die niet wonnen maar wél willen weten waar ze
 * geëindigd zijn.
 *
 * - Met knock-outfase: winnaar/verliezer finale = 1/2, winnaar troostfinale = 3.
 * - Alleen één poule (competitie/round-robin): de volledige eindstand zodra
 *   alle wedstrijden gespeeld zijn.
 * - Anders (meerdere poules zonder bracket, individueel): null — geen
 *   eenduidig eindklassement.
 */
export function podium(d: Division, scoring: ScoringConfig): PodiumEntry[] | null {
  for (const s of [...d.stages].reverse()) {
    if (s.type !== "bracket") continue;
    const finale = s.rounds[s.rounds.length - 1]?.matches[0];
    if (!finale) continue;
    const w = winnerOf(finale);
    if (!w) return null; // finale nog niet beslist
    const first = resolveSlot(w === "a" ? finale.a : finale.b, d, scoring);
    const second = resolveSlot(w === "a" ? finale.b : finale.a, d, scoring);
    const out: PodiumEntry[] = [];
    if (first) out.push({ place: 1, teamId: first.id });
    if (second) out.push({ place: 2, teamId: second.id });
    const troost = s.rounds.find((r) => r.name === "Troostfinale")?.matches[0];
    if (troost) {
      const tw = winnerOf(troost);
      const third = tw ? resolveSlot(tw === "a" ? troost.a : troost.b, d, scoring) : null;
      if (third) out.push({ place: 3, teamId: third.id });
    }
    return out.length > 0 ? out : null;
  }

  const pouleStagesArr = d.stages.filter((s) => s.type === "poules");
  if (pouleStagesArr.length === 1 && pouleStagesArr[0].poules.length === 1) {
    const p = pouleStagesArr[0].poules[0];
    if (p.matches.length === 0 || !p.matches.every(isPlayed)) return null;
    return pouleStandings(p, scoring).map((r, i) => ({ place: i + 1, teamId: r.teamId }));
  }
  return null;
}
