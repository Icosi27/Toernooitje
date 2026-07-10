import type { Division, ID, Match, Slot } from "../types";
import { allMatches } from "./resolve";
import { isPlayed } from "./standings";

const isTeamSlot = (s: Slot, teamId: ID) => s.kind === "team" && s.teamId === teamId;
const involves = (m: Match, teamId: ID) => isTeamSlot(m.a, teamId) || isTeamSlot(m.b, teamId);

/**
 * Team trekt zich terug (blessures, te laat, niet komen opdagen): alle
 * openstaande wedstrijden waarvan de tegenstander al bekend is, gaan
 * reglementair naar de tegenstander. Gespeelde uitslagen blijven staan,
 * zodat de stand klopt voor de teams die wél gespeeld hebben.
 * Geeft het aantal reglementair toegekende wedstrijden terug.
 */
export function withdrawTeam(d: Division, teamId: ID, walkoverScore = 3): number {
  let awarded = 0;
  for (const m of allMatches(d)) {
    if (!involves(m, teamId) || isPlayed(m)) continue;
    const withdrawingIsA = isTeamSlot(m.a, teamId);
    const opponent = withdrawingIsA ? m.b : m.a;
    // tegenstander nog onbekend (winner/pouleRank): laat open voor de organisator
    if (opponent.kind !== "team") continue;
    m.scoreA = withdrawingIsA ? 0 : walkoverScore;
    m.scoreB = withdrawingIsA ? walkoverScore : 0;
    m.pensA = undefined;
    m.pensB = undefined;
    m.inProgress = undefined;
    awarded++;
  }
  const team = d.teams.find((t) => t.id === teamId);
  if (team) team.withdrawn = true;
  return awarded;
}

/**
 * Team volledig verwijderen: uit de teamlijst, uit poule-indelingen en uit het
 * schema. Openstaande poulewedstrijden van het team verdwijnen; in brackets
 * wordt de plek weer "n.t.b.". Gespeelde wedstrijden blijven onaangetast.
 */
export function removeTeamEverywhere(d: Division, teamId: ID): void {
  for (const s of d.stages) {
    if (s.type === "poules") {
      for (const p of s.poules) {
        p.teamIds = p.teamIds.filter((id) => id !== teamId);
        p.matches = p.matches.filter((m) => !involves(m, teamId) || isPlayed(m));
      }
    } else if (s.type === "bracket") {
      for (const r of s.rounds) {
        for (const m of r.matches) {
          if (isPlayed(m)) continue;
          if (isTeamSlot(m.a, teamId)) m.a = { kind: "tbd" };
          if (isTeamSlot(m.b, teamId)) m.b = { kind: "tbd" };
        }
      }
    }
  }
  d.teams = d.teams.filter((t) => t.id !== teamId);
}

/** Staat dit team ergens in een indeling of schema? (bepaalt welke actie de UI aanbiedt) */
export function teamInStages(d: Division, teamId: ID): boolean {
  for (const s of d.stages) {
    if (s.type === "poules" && s.poules.some((p) => p.teamIds.includes(teamId))) return true;
  }
  return allMatches(d).some((m) => involves(m, teamId));
}
