import { describe, expect, it } from "vitest";
import type { Division, Match, Team } from "../types";
import { defaultScoring } from "../types";
import { qualificationScenario } from "./scenario";

const scoring = defaultScoring();
const team = (id: string): Team => ({ id, name: id.toUpperCase(), players: [] });
const m = (id: string, a: string, b: string, sa?: number, sb?: number): Match => ({
  id,
  a: { kind: "team", teamId: a },
  b: { kind: "team", teamId: b },
  scoreA: sa,
  scoreB: sb,
});

/** Poule van 3 met KO erachter: nr. 1 en 2 gaan door. */
function division(matches: Match[]): Division {
  return {
    id: "d1",
    name: "D",
    individualMode: false,
    players: [],
    teams: [team("t1"), team("t2"), team("t3")],
    stages: [
      {
        id: "s1",
        type: "poules",
        name: "Groepsfase",
        poules: [{ id: "p1", name: "Poule A", teamIds: ["t1", "t2", "t3"], matches }],
      },
      {
        id: "s2",
        type: "bracket",
        name: "KO",
        size: 2,
        rounds: [
          {
            name: "Finale",
            matches: [
              {
                id: "f1",
                a: { kind: "pouleRank", pouleId: "p1", rank: 1 },
                b: { kind: "pouleRank", pouleId: "p1", rank: 2 },
              },
            ],
          },
        ],
      },
    ],
  };
}

describe("qualificationScenario", () => {
  it("beschrijft een team boven de streep met voorsprong", () => {
    const d = division([m("m1", "t1", "t2", 2, 0), m("m2", "t1", "t3"), m("m3", "t2", "t3")]);
    const txt = qualificationScenario(d, "t1", scoring);
    expect(txt).toContain("Jullie staan 1e");
    expect(txt).toContain("Top 2 gaat door");
    expect(txt).toContain("nog 1 wedstrijd");
  });

  it("beschrijft een team onder de streep met achterstand", () => {
    // t1 en t2 hebben elk 3 punten, t3 nog 0 met één wedstrijd te gaan
    const d = division([m("m1", "t1", "t2", 2, 0), m("m2", "t2", "t3", 1, 0), m("m3", "t1", "t3")]);
    const txt = qualificationScenario(d, "t3", scoring);
    expect(txt).toContain("Jullie staan 3e");
    expect(txt).toContain("3 punten achter nr. 2");
  });

  it("meldt de eindstand zodra de poule uitgespeeld is", () => {
    const d = division([
      m("m1", "t1", "t2", 2, 0),
      m("m2", "t1", "t3", 3, 0),
      m("m3", "t2", "t3", 1, 0),
    ]);
    expect(qualificationScenario(d, "t2", scoring)).toContain("jullie gaan door");
    expect(qualificationScenario(d, "t3", scoring)).toContain("top 2 gaat door");
  });

  it("geeft null zonder knock-outfase (niets te kwalificeren)", () => {
    const d = division([m("m1", "t1", "t2", 2, 0)]);
    d.stages = [d.stages[0]];
    expect(qualificationScenario(d, "t1", scoring)).toBeNull();
  });
});
