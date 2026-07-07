import type { Division, ID, Match, ScoringConfig, Slot, Team } from "../types";
import { isPlayed, pouleStandings } from "./standings";

/** Alle wedstrijden van een divisie, in fase-volgorde. */
export function allMatches(d: Division): Match[] {
  const out: Match[] = [];
  for (const s of d.stages) {
    if (s.type === "poules") s.poules.forEach((p) => out.push(...p.matches));
    else if (s.type === "bracket") s.rounds.forEach((r) => out.push(...r.matches));
    else s.rounds.forEach((r) => out.push(...r));
  }
  return out;
}

export function findMatch(d: Division, matchId: ID): Match | undefined {
  return allMatches(d).find((m) => m.id === matchId);
}

export function winnerOf(m: Match): "a" | "b" | null {
  if (!isPlayed(m)) return null;
  if (m.scoreA! > m.scoreB!) return "a";
  if (m.scoreB! > m.scoreA!) return "b";
  if (m.pensA !== undefined && m.pensB !== undefined && m.pensA !== m.pensB)
    return m.pensA > m.pensB ? "a" : "b";
  return null;
}

/** Zet een slot om naar een concreet team, als dat al bekend is. */
export function resolveSlot(slot: Slot, d: Division, scoring: ScoringConfig): Team | null {
  switch (slot.kind) {
    case "team":
      return d.teams.find((t) => t.id === slot.teamId) ?? null;
    case "pouleRank": {
      for (const s of d.stages) {
        if (s.type !== "poules") continue;
        const poule = s.poules.find((p) => p.id === slot.pouleId);
        if (!poule) continue;
        const complete = poule.matches.length > 0 && poule.matches.every(isPlayed);
        if (!complete) return null;
        const rows = pouleStandings(poule, scoring);
        const row = rows[slot.rank - 1];
        return row ? (d.teams.find((t) => t.id === row.teamId) ?? null) : null;
      }
      return null;
    }
    case "winner":
    case "loser": {
      const m = findMatch(d, slot.matchId);
      if (!m) return null;
      const w = winnerOf(m);
      if (!w) return null;
      const side = slot.kind === "winner" ? w : w === "a" ? "b" : "a";
      return resolveSlot(side === "a" ? m.a : m.b, d, scoring);
    }
    case "tbd":
      return null;
  }
}

/** Weergavenaam van een slot, met poule-namen als placeholder. */
export function slotLabel(slot: Slot, d: Division, scoring: ScoringConfig): string {
  const team = resolveSlot(slot, d, scoring);
  if (team) return team.name;
  switch (slot.kind) {
    case "pouleRank": {
      for (const s of d.stages) {
        if (s.type !== "poules") continue;
        const poule = s.poules.find((p) => p.id === slot.pouleId);
        if (poule) return `Nr. ${slot.rank} ${poule.name}`;
      }
      return `Nr. ${slot.rank} ?`;
    }
    case "winner": {
      const m = findMatch(d, slot.matchId);
      return m?.label ? `Winnaar ${m.label}` : "Winnaar ?";
    }
    case "loser": {
      const m = findMatch(d, slot.matchId);
      return m?.label ? `Verliezer ${m.label}` : "Verliezer ?";
    }
    default:
      return "N.t.b.";
  }
}
