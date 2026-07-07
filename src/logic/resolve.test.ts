import { describe, expect, it } from "vitest";
import type { Division, Match } from "../types";
import { defaultScoring } from "../types";
import { buildFormat } from "./formats";
import { allMatches, qualifyingRanks, resolveSlot, slotLabel, winnerOf } from "./resolve";
import { isPlayed } from "./standings";
import { uid } from "./id";

function wkDivision(): Division {
  const d: Division = {
    id: uid(),
    name: "Divisie 1",
    teams: Array.from({ length: 8 }, (_, i) => ({ id: `t${i}`, name: `Team ${i}`, players: [] })),
    players: [],
    individualMode: false,
    stages: [],
  };
  d.stages = buildFormat(d, "wk", { pouleCount: 2, koSize: 4 });
  return d;
}

describe("winnerOf", () => {
  const base: Match = { id: "m", a: { kind: "tbd" }, b: { kind: "tbd" } };
  it("bepaalt de winnaar op doelpunten", () => {
    expect(winnerOf({ ...base, scoreA: 2, scoreB: 1 })).toBe("a");
    expect(winnerOf({ ...base, scoreA: 0, scoreB: 3 })).toBe("b");
  });
  it("valt terug op strafschoppen bij gelijkspel", () => {
    expect(winnerOf({ ...base, scoreA: 1, scoreB: 1, pensA: 4, pensB: 3 })).toBe("a");
    expect(winnerOf({ ...base, scoreA: 1, scoreB: 1 })).toBeNull();
  });
  it("geeft null zonder uitslag", () => {
    expect(winnerOf(base)).toBeNull();
  });
});

describe("resolveSlot met WK-format (2 poules + KO van 4)", () => {
  it("laat pouleRank pas een team opleveren als de poule uit is", () => {
    const d = wkDivision();
    const scoring = defaultScoring();
    const ko = d.stages[1];
    if (ko.type !== "bracket") throw new Error("verwacht bracket");
    const firstSlot = ko.rounds[0].matches[0].a;
    expect(resolveSlot(firstSlot, d, scoring)).toBeNull();

    // speel alle poulewedstrijden: hoger teamnummer wint altijd
    for (const s of d.stages) {
      if (s.type !== "poules") continue;
      for (const p of s.poules) {
        for (const m of p.matches) {
          const a = (m.a as any).teamId as string;
          const b = (m.b as any).teamId as string;
          const aWins = a > b;
          m.scoreA = aWins ? 2 : 0;
          m.scoreB = aWins ? 0 : 2;
        }
      }
    }
    const resolved = resolveSlot(firstSlot, d, scoring);
    expect(resolved).not.toBeNull();
  });

  it("laat winnaars doorstromen naar de finale", () => {
    const d = wkDivision();
    const scoring = defaultScoring();
    // poules afronden
    for (const s of d.stages)
      if (s.type === "poules")
        for (const p of s.poules)
          for (const m of p.matches) {
            m.scoreA = 1;
            m.scoreB = 0;
          }
    const ko = d.stages[1];
    if (ko.type !== "bracket") throw new Error("verwacht bracket");
    const halve = ko.rounds[0].matches;
    halve[0].scoreA = 3;
    halve[0].scoreB = 0;
    halve[1].scoreA = 0;
    halve[1].scoreB = 3;
    const finale = ko.rounds[ko.rounds.length - 1].matches[0];
    const fa = resolveSlot(finale.a, d, scoring);
    const fb = resolveSlot(finale.b, d, scoring);
    expect(fa).not.toBeNull();
    expect(fb).not.toBeNull();
    expect(fa!.id).not.toBe(fb!.id);
    // de finalisten zijn de winnaars van de halve finales
    const w1 = resolveSlot(halve[0].a, d, scoring);
    expect(fa!.id).toBe(w1!.id);
  });

  it("qualifyingRanks leest de doorstroomplekken uit de bracket", () => {
    const d = wkDivision();
    for (const s of d.stages) {
      if (s.type !== "poules") continue;
      for (const p of s.poules) {
        expect(qualifyingRanks(d, p.id)).toEqual([1, 2]);
      }
    }
  });

  it("slotLabel toont een placeholder tot het team bekend is", () => {
    const d = wkDivision();
    const ko = d.stages[1];
    if (ko.type !== "bracket") throw new Error("verwacht bracket");
    const label = slotLabel(ko.rounds[0].matches[0].a, d, defaultScoring());
    expect(label).toMatch(/^Nr\. \d Poule/);
  });

  it("allMatches telt poule- en KO-wedstrijden", () => {
    const d = wkDivision();
    // 2 poules van 4 = 2x6, KO van 4 = 2 + troost + finale = 4
    expect(allMatches(d)).toHaveLength(16);
    expect(allMatches(d).filter(isPlayed)).toHaveLength(0);
  });
});
