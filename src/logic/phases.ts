import type { BracketStage, Division, ID, ScoringConfig, Stage } from "../types";
import { isPlayed, pouleStandings } from "./standings";

/**
 * Fase-beheer: de organisator ziet per fase hoeveel uitslagen er binnen zijn
 * en start de volgende fase met een bewuste handeling. Pas op dat moment
 * worden de poule-plaatsingen ("Nr. 1 Poule A") omgezet in echte teams.
 */

export function stageProgress(s: Stage): { done: number; total: number } {
  const matches =
    s.type === "poules"
      ? s.poules.flatMap((p) => p.matches)
      : s.type === "bracket"
        ? s.rounds.flatMap((r) => r.matches)
        : s.rounds.flat();
  return { done: matches.filter(isPlayed).length, total: matches.length };
}

/** Uit welke poules haalt deze bracket zijn teams? */
function sourcePouleIds(stage: BracketStage): Set<ID> {
  const ids = new Set<ID>();
  for (const r of stage.rounds)
    for (const m of r.matches)
      for (const slot of [m.a, m.b]) if (slot.kind === "pouleRank") ids.add(slot.pouleId);
  return ids;
}

export interface Readiness {
  /** kan de fase gestart worden? */
  ready: boolean;
  /** hoeveel uitslagen ontbreken er nog in de voedende poules */
  missing: number;
  /** haalt deze bracket überhaupt teams uit poules (anders is starten niet nodig) */
  hasSources: boolean;
}

export function bracketReadiness(d: Division, stage: BracketStage): Readiness {
  const ids = sourcePouleIds(stage);
  if (ids.size === 0) return { ready: true, missing: 0, hasSources: false };
  let missing = 0;
  for (const s of d.stages) {
    if (s.type !== "poules") continue;
    for (const p of s.poules) {
      if (!ids.has(p.id)) continue;
      missing += p.matches.filter((m) => !isPlayed(m)).length;
    }
  }
  return { ready: missing === 0, missing, hasSources: true };
}

/**
 * De fysieke handeling: zet alle poule-plaatsingen om in echte teams op basis
 * van de eindstand en markeer de fase als gestart. Alleen mogelijk als alle
 * voedende poules compleet zijn.
 */
export function startBracketStage(d: Division, stageId: ID, scoring: ScoringConfig): boolean {
  const stage = d.stages.find((s) => s.id === stageId);
  if (!stage || stage.type !== "bracket" || stage.started) return false;
  if (!bracketReadiness(d, stage).ready) return false;

  const rankTeam = (pouleId: ID, rank: number): ID | null => {
    for (const s of d.stages) {
      if (s.type !== "poules") continue;
      const p = s.poules.find((x) => x.id === pouleId);
      if (p) return pouleStandings(p, scoring)[rank - 1]?.teamId ?? null;
    }
    return null;
  };

  for (const r of stage.rounds) {
    for (const m of r.matches) {
      for (const side of ["a", "b"] as const) {
        const slot = m[side];
        if (slot.kind !== "pouleRank") continue;
        const teamId = rankTeam(slot.pouleId, slot.rank);
        if (teamId) m[side] = { kind: "team", teamId };
      }
    }
  }
  stage.started = true;
  return true;
}

/** Wedstrijden in nog niet gestarte fases (verbergen voor scheidsrechters). */
export function gatedMatchIds(divisions: Division[]): Set<ID> {
  const ids = new Set<ID>();
  for (const d of divisions) {
    for (const s of d.stages) {
      if (s.type !== "bracket" || s.started) continue;
      if (sourcePouleIds(s).size === 0) continue;
      for (const r of s.rounds) for (const m of r.matches) ids.add(m.id);
    }
  }
  return ids;
}
