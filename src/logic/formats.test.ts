import { describe, expect, it } from "vitest";
import type { Division } from "../types";
import { buildFormat, nextPowerOfTwo, seedKnockoutWithTeams } from "./formats";
import { uid } from "./id";

const division = (teamCount: number): Division => ({
  id: uid(),
  name: "Divisie 1",
  teams: Array.from({ length: teamCount }, (_, i) => ({ id: `t${i}`, name: `Team ${i}`, players: [] })),
  players: Array.from({ length: teamCount }, (_, i) => ({ id: `p${i}`, name: `Speler ${i}` })),
  individualMode: false,
  stages: [],
});

describe("buildFormat", () => {
  it("competitie: één poule waarin iedereen één keer speelt", () => {
    const d = division(6);
    const stages = buildFormat(d, "competitie", {});
    expect(stages).toHaveLength(1);
    const s = stages[0];
    if (s.type !== "poules") throw new Error("verwacht poules");
    expect(s.poules).toHaveLength(1);
    expect(s.poules[0].matches).toHaveLength(15); // 6 over 2
  });

  it("roundrobin: uit én thuis", () => {
    const d = division(4);
    const s = buildFormat(d, "roundrobin", {})[0];
    if (s.type !== "poules") throw new Error("verwacht poules");
    expect(s.poules[0].matches).toHaveLength(12);
  });

  it("wk: poules plus knock-out", () => {
    const d = division(8);
    const stages = buildFormat(d, "wk", { pouleCount: 2, koSize: 4 });
    expect(stages.map((s) => s.type)).toEqual(["poules", "bracket"]);
    const poules = stages[0];
    if (poules.type !== "poules") throw new Error();
    expect(poules.poules).toHaveLength(2);
    expect(poules.poules[0].teamIds).toHaveLength(4);
  });

  it("championsleague: poules van 4, nummers 1-2 door", () => {
    const d = division(16);
    const stages = buildFormat(d, "championsleague", {});
    const poules = stages[0];
    if (poules.type !== "poules") throw new Error();
    expect(poules.poules).toHaveLength(4);
    const ko = stages[1];
    if (ko.type !== "bracket") throw new Error();
    expect(ko.size).toBe(8);
  });

  it("knockout: bracket met alle teams gezaaid", () => {
    const d = division(8);
    const stages = buildFormat(d, "knockout", { koSize: 8 });
    const ko = stages[0];
    if (ko.type !== "bracket") throw new Error();
    seedKnockoutWithTeams(ko, d);
    const seeded = ko.rounds[0].matches.flatMap((m) => [m.a, m.b]);
    expect(seeded.every((s) => s.kind === "team")).toBe(true);
    expect(new Set(seeded.map((s: any) => s.teamId)).size).toBe(8);
  });

  it("individueel: rondes met lotingteams", () => {
    const d = division(8);
    const stages = buildFormat(d, "individueel", { teamSize: 4, roundsCount: 5 });
    const s = stages[0];
    if (s.type !== "individual") throw new Error();
    expect(s.rounds).toHaveLength(5);
    expect(s.teamSize).toBe(4);
  });
});

describe("nextPowerOfTwo", () => {
  it("rondt op naar de eerstvolgende macht van 2", () => {
    expect(nextPowerOfTwo(3)).toBe(4);
    expect(nextPowerOfTwo(4)).toBe(4);
    expect(nextPowerOfTwo(9)).toBe(16);
    expect(nextPowerOfTwo(100)).toBe(32); // gemaximeerd
  });
});
