import { describe, expect, it } from "vitest";
import type { Player } from "../types";
import { buildIndividualStage, individualStandings } from "./individual";

const players = (n: number): Player[] =>
  Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `Speler ${i}` }));

describe("buildIndividualStage (4x4)", () => {
  it("maakt per ronde teams van de juiste grootte met unieke spelers", () => {
    const stage = buildIndividualStage(players(8), 4, 3);
    expect(stage.rounds).toHaveLength(3);
    for (const round of stage.rounds) {
      expect(round).toHaveLength(1); // 8 spelers / (4x2) = 1 wedstrijd
      const lineup = stage.lineups[round[0].id];
      expect(lineup.a).toHaveLength(4);
      expect(lineup.b).toHaveLength(4);
      const all = [...lineup.a, ...lineup.b];
      expect(new Set(all).size).toBe(8);
    }
  });

  it("husselt de teams per ronde (niet elke ronde dezelfde indeling)", () => {
    const stage = buildIndividualStage(players(8), 4, 3);
    const teamOf = (roundIdx: number) =>
      [...stage.lineups[stage.rounds[roundIdx][0].id].a].sort().join(",");
    const distinct = new Set([teamOf(0), teamOf(1), teamOf(2)]);
    expect(distinct.size).toBeGreaterThan(1);
  });

  it("laat spelers buiten de boot vallen als het aantal niet past", () => {
    const stage = buildIndividualStage(players(10), 4, 1);
    // 10 spelers, 8 per wedstrijd -> 1 wedstrijd, 2 reserve
    expect(stage.rounds[0]).toHaveLength(1);
  });
});

describe("individualStandings", () => {
  it("geeft alle spelers van het winnende team de winstpunten", () => {
    const ps = players(8);
    const stage = buildIndividualStage(ps, 4, 2);
    const r1 = stage.rounds[0][0];
    r1.scoreA = 3;
    r1.scoreB = 1;
    const rows = individualStandings(stage, ps, 3, 1, 0);
    const lineup = stage.lineups[r1.id];
    for (const id of lineup.a) {
      const row = rows.find((r) => r.playerId === id)!;
      expect(row.points).toBe(3);
      expect(row.won).toBe(1);
    }
    for (const id of lineup.b) {
      const row = rows.find((r) => r.playerId === id)!;
      expect(row.points).toBe(0);
      expect(row.lost).toBe(1);
    }
  });

  it("sorteert op punten en daarna doelsaldo", () => {
    const ps = players(8);
    const stage = buildIndividualStage(ps, 4, 1);
    stage.rounds[0][0].scoreA = 5;
    stage.rounds[0][0].scoreB = 0;
    const rows = individualStandings(stage, ps, 3, 1, 0);
    expect(rows[0].points).toBeGreaterThanOrEqual(rows[rows.length - 1].points);
  });
});
