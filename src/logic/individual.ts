import type { ID, IndividualStage, Match, Player } from "../types";
import { uid } from "./id";

/**
 * Individueel toernooi (bijv. 4x4): spelers worden per ronde in wisselende
 * ad-hoc teams geloot. Punten tellen per speler; de individuele winnaar wint.
 */
export function buildIndividualStage(
  players: Player[],
  teamSize: number,
  roundsCount: number
): IndividualStage {
  const stage: IndividualStage = {
    id: uid(),
    type: "individual",
    name: `Individueel ${teamSize}x${teamSize}`,
    teamSize,
    roundsCount,
    rounds: [],
    lineups: {},
  };

  const ids = players.map((p) => p.id);
  for (let r = 0; r < roundsCount; r++) {
    const shuffled = rotate(ids, r);
    const perMatch = teamSize * 2;
    const matchCount = Math.floor(shuffled.length / perMatch);
    const round: Match[] = [];
    for (let m = 0; m < matchCount; m++) {
      const chunk = shuffled.slice(m * perMatch, (m + 1) * perMatch);
      const match: Match = {
        id: uid(),
        a: { kind: "tbd" },
        b: { kind: "tbd" },
        round: r + 1,
        label: `Ronde ${r + 1} — Wedstrijd ${m + 1}`,
      };
      stage.lineups[match.id] = {
        a: chunk.slice(0, teamSize),
        b: chunk.slice(teamSize),
      };
      round.push(match);
    }
    stage.rounds.push(round);
  }
  return stage;
}

/** Deterministische herverdeling zodat spelers elke ronde andere teamgenoten krijgen. */
function rotate(ids: ID[], round: number): ID[] {
  if (ids.length < 2) return [...ids];
  const arr = [...ids];
  // interleave met stap die per ronde groeit (coprime-achtig effect)
  const step = (round * 2 + 3) % arr.length || 1;
  const out: ID[] = [];
  let i = 0;
  const used = new Set<number>();
  while (out.length < arr.length) {
    while (used.has(i)) i = (i + 1) % arr.length;
    out.push(arr[i]);
    used.add(i);
    i = (i + step) % arr.length;
  }
  return out;
}

export interface PlayerStanding {
  playerId: ID;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
}

export function individualStandings(
  stage: IndividualStage,
  players: Player[],
  win: number,
  draw: number,
  loss: number
): PlayerStanding[] {
  const rows = new Map<ID, PlayerStanding>();
  players.forEach((p) =>
    rows.set(p.id, {
      playerId: p.id,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      points: 0,
      goalsFor: 0,
      goalsAgainst: 0,
    })
  );

  for (const round of stage.rounds) {
    for (const m of round) {
      if (m.scoreA === undefined || m.scoreB === undefined) continue;
      const lineup = stage.lineups[m.id];
      if (!lineup) continue;
      const apply = (ids: ID[], gf: number, ga: number) => {
        for (const id of ids) {
          const r = rows.get(id);
          if (!r) continue;
          r.played++;
          r.goalsFor += gf;
          r.goalsAgainst += ga;
          if (gf > ga) {
            r.won++;
            r.points += win;
          } else if (gf < ga) {
            r.lost++;
            r.points += loss;
          } else {
            r.drawn++;
            r.points += draw;
          }
        }
      };
      apply(lineup.a, m.scoreA, m.scoreB);
      apply(lineup.b, m.scoreB, m.scoreA);
    }
  }

  return [...rows.values()].sort(
    (x, y) =>
      y.points - x.points ||
      y.goalsFor - y.goalsAgainst - (x.goalsFor - x.goalsAgainst) ||
      y.goalsFor - x.goalsFor
  );
}
