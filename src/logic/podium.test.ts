import { describe, expect, it } from "vitest";
import type { Division, Match, Team } from "../types";
import { defaultScoring } from "../types";
import { podium } from "./podium";

const scoring = defaultScoring();
const team = (id: string): Team => ({ id, name: id.toUpperCase(), players: [] });
const m = (id: string, a: string, b: string, sa?: number, sb?: number): Match => ({
  id,
  a: { kind: "team", teamId: a },
  b: { kind: "team", teamId: b },
  scoreA: sa,
  scoreB: sb,
});

describe("podium", () => {
  it("bepaalt 1/2/3 uit finale en troostfinale", () => {
    const d: Division = {
      id: "d1",
      name: "D",
      individualMode: false,
      players: [],
      teams: [team("t1"), team("t2"), team("t3"), team("t4")],
      stages: [
        {
          id: "s1",
          type: "bracket",
          name: "KO",
          size: 4,
          rounds: [
            { name: "Halve finale", matches: [m("h1", "t1", "t4", 2, 0), m("h2", "t2", "t3", 1, 0)] },
            { name: "Troostfinale", matches: [m("tf", "t4", "t3", 0, 1)] },
            { name: "Finale", matches: [m("f", "t1", "t2", 3, 1)] },
          ],
        },
      ],
    };
    expect(podium(d, scoring)).toEqual([
      { place: 1, teamId: "t1" },
      { place: 2, teamId: "t2" },
      { place: 3, teamId: "t3" },
    ]);
  });

  it("geeft null zolang de finale niet beslist is", () => {
    const d: Division = {
      id: "d1",
      name: "D",
      individualMode: false,
      players: [],
      teams: [team("t1"), team("t2")],
      stages: [
        {
          id: "s1",
          type: "bracket",
          name: "KO",
          size: 2,
          rounds: [{ name: "Finale", matches: [m("f", "t1", "t2")] }],
        },
      ],
    };
    expect(podium(d, scoring)).toBeNull();
  });

  it("geeft de volledige eindstand van één volledig gespeelde poule", () => {
    const d: Division = {
      id: "d1",
      name: "D",
      individualMode: false,
      players: [],
      teams: [team("t1"), team("t2"), team("t3")],
      stages: [
        {
          id: "s1",
          type: "poules",
          name: "Competitie",
          poules: [
            {
              id: "p1",
              name: "Poule A",
              teamIds: ["t1", "t2", "t3"],
              matches: [
                m("m1", "t1", "t2", 2, 0),
                m("m2", "t1", "t3", 1, 1),
                m("m3", "t2", "t3", 0, 3),
              ],
            },
          ],
        },
      ],
    };
    const result = podium(d, scoring);
    // t3 en t1 hebben beide 4 punten; t3 wint op doelsaldo (+3 om +2)
    expect(result?.map((r) => r.teamId)).toEqual(["t3", "t1", "t2"]);
    expect(result?.map((r) => r.place)).toEqual([1, 2, 3]);
  });

  it("geeft null bij een half gespeelde poule of meerdere poules", () => {
    const half: Division = {
      id: "d1",
      name: "D",
      individualMode: false,
      players: [],
      teams: [team("t1"), team("t2"), team("t3")],
      stages: [
        {
          id: "s1",
          type: "poules",
          name: "Competitie",
          poules: [
            {
              id: "p1",
              name: "Poule A",
              teamIds: ["t1", "t2", "t3"],
              matches: [m("m1", "t1", "t2", 2, 0), m("m2", "t1", "t3")],
            },
          ],
        },
      ],
    };
    expect(podium(half, scoring)).toBeNull();
  });
});
