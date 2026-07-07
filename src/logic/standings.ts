import type { ID, Match, Poule, ScoringConfig, TiebreakCriterion } from "../types";

export interface StandingRow {
  teamId: ID;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
}

const emptyRow = (teamId: ID): StandingRow => ({
  teamId,
  played: 0,
  won: 0,
  drawn: 0,
  lost: 0,
  points: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  goalDiff: 0,
});

export function isPlayed(m: Match): boolean {
  // een live-wedstrijd heeft al een score, maar telt pas mee (standen,
  // fase-voortgang, doorstroming) zodra de eindstand is opgeslagen
  return m.scoreA !== undefined && m.scoreB !== undefined && !m.inProgress;
}

/** Berekent de stand van een poule met configureerbare tiebreak-criteria. */
export function pouleStandings(poule: Poule, scoring: ScoringConfig): StandingRow[] {
  const rows = new Map<ID, StandingRow>();
  poule.teamIds.forEach((t) => rows.set(t, emptyRow(t)));

  for (const m of poule.matches) {
    if (!isPlayed(m) || m.a.kind !== "team" || m.b.kind !== "team") continue;
    const ra = rows.get(m.a.teamId);
    const rb = rows.get(m.b.teamId);
    if (!ra || !rb) continue;
    const sa = m.scoreA!;
    const sb = m.scoreB!;
    ra.played++;
    rb.played++;
    ra.goalsFor += sa;
    ra.goalsAgainst += sb;
    rb.goalsFor += sb;
    rb.goalsAgainst += sa;
    if (sa > sb) {
      ra.won++;
      rb.lost++;
      ra.points += scoring.win;
      rb.points += scoring.loss;
    } else if (sa < sb) {
      rb.won++;
      ra.lost++;
      rb.points += scoring.win;
      ra.points += scoring.loss;
    } else {
      ra.drawn++;
      rb.drawn++;
      ra.points += scoring.draw;
      rb.points += scoring.draw;
    }
  }
  rows.forEach((r) => (r.goalDiff = r.goalsFor - r.goalsAgainst));

  const list = [...rows.values()];
  list.sort((x, y) => compareRows(x, y, poule.matches, scoring.criteria));
  return list;
}

function compareRows(
  x: StandingRow,
  y: StandingRow,
  matches: Match[],
  criteria: TiebreakCriterion[]
): number {
  for (const c of criteria) {
    let d = 0;
    switch (c) {
      case "points":
        d = y.points - x.points;
        break;
      case "goalDiff":
        d = y.goalDiff - x.goalDiff;
        break;
      case "goalsFor":
        d = y.goalsFor - x.goalsFor;
        break;
      case "headToHead":
        d = headToHead(x.teamId, y.teamId, matches);
        break;
    }
    if (d !== 0) return d;
  }
  return 0;
}

/** Onderling resultaat: positief als y won, negatief als x won. */
function headToHead(x: ID, y: ID, matches: Match[]): number {
  let gx = 0;
  let gy = 0;
  for (const m of matches) {
    if (!isPlayed(m) || m.a.kind !== "team" || m.b.kind !== "team") continue;
    if (m.a.teamId === x && m.b.teamId === y) {
      gx += m.scoreA!;
      gy += m.scoreB!;
    } else if (m.a.teamId === y && m.b.teamId === x) {
      gy += m.scoreA!;
      gx += m.scoreB!;
    }
  }
  return gy - gx;
}

export const criterionLabels: Record<TiebreakCriterion, string> = {
  points: "Aantal punten",
  goalDiff: "Doelsaldo",
  goalsFor: "Aantal gescoorde doelpunten",
  headToHead: "Onderling resultaat",
};
