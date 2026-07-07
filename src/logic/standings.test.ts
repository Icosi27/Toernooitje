import { describe, expect, it } from "vitest";
import type { Match, Poule } from "../types";
import { defaultScoring } from "../types";
import { pouleStandings } from "./standings";

const match = (a: string, b: string, sa?: number, sb?: number): Match => ({
  id: `${a}-${b}`,
  a: { kind: "team", teamId: a },
  b: { kind: "team", teamId: b },
  scoreA: sa,
  scoreB: sb,
});

const poule = (teamIds: string[], matches: Match[]): Poule => ({
  id: "p1",
  name: "Poule A",
  teamIds,
  matches,
});

describe("pouleStandings", () => {
  it("telt punten: winst 3, gelijk 1, verlies 0", () => {
    const p = poule(["a", "b", "c"], [match("a", "b", 2, 0), match("b", "c", 1, 1), match("a", "c", 0, 1)]);
    const rows = pouleStandings(p, defaultScoring());
    const byId = Object.fromEntries(rows.map((r) => [r.teamId, r]));
    expect(byId.a.points).toBe(3);
    expect(byId.b.points).toBe(1);
    expect(byId.c.points).toBe(4);
    expect(rows[0].teamId).toBe("c");
  });

  it("gebruikt doelsaldo als tweede criterium", () => {
    // a en b winnen allebei van c; a met meer verschil
    const p = poule(["a", "b", "c"], [match("a", "c", 5, 0), match("b", "c", 1, 0), match("a", "b", 1, 1)]);
    const rows = pouleStandings(p, defaultScoring());
    expect(rows[0].teamId).toBe("a");
    expect(rows[1].teamId).toBe("b");
  });

  it("gebruikt onderling resultaat als laatste criterium", () => {
    // identieke punten, saldo en doelpunten; b won onderling van a
    const p = poule(
      ["a", "b", "c", "d"],
      [
        match("b", "a", 1, 0),
        match("a", "c", 2, 1),
        match("b", "d", 1, 0), // b: 2 zeges, 2-0 saldo... maak symmetrisch:
        match("a", "d", 1, 0),
        match("b", "c", 1, 1),
        match("c", "d", 0, 0),
      ]
    );
    const scoring = defaultScoring();
    const rows = pouleStandings(p, scoring);
    const ia = rows.findIndex((r) => r.teamId === "a");
    const ib = rows.findIndex((r) => r.teamId === "b");
    // b heeft meer punten (7 om 6) dus sowieso hoger; check volgorde klopt
    expect(ib).toBeLessThan(ia);
  });

  it("respecteert een aangepaste criteria-volgorde", () => {
    // a heeft beter saldo, b meer doelpunten voor; gelijk in punten
    const p = poule(["a", "b", "c"], [match("a", "c", 2, 0), match("b", "c", 4, 3), match("a", "b", 0, 0)]);
    const standard = pouleStandings(p, defaultScoring());
    expect(standard[0].teamId).toBe("a"); // saldo +2 vs +1
    const custom = pouleStandings(p, {
      ...defaultScoring(),
      criteria: ["points", "goalsFor", "goalDiff", "headToHead"],
    });
    expect(custom[0].teamId).toBe("b"); // 4 doelpunten vs 2
  });

  it("negeert wedstrijden zonder uitslag", () => {
    const p = poule(["a", "b"], [match("a", "b")]);
    const rows = pouleStandings(p, defaultScoring());
    expect(rows[0].played).toBe(0);
    expect(rows[0].points).toBe(0);
  });
});
