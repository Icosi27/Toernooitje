import { describe, expect, it } from "vitest";
import { roundRobin } from "./roundrobin";

const pairKey = (a: string, b: string) => [a, b].sort().join("-");

describe("roundRobin", () => {
  it("laat 4 teams precies één keer tegen elkaar spelen in 3 rondes", () => {
    const matches = roundRobin(["a", "b", "c", "d"]);
    expect(matches).toHaveLength(6);
    const pairs = new Set(
      matches.map((m) => pairKey((m.a as any).teamId, (m.b as any).teamId))
    );
    expect(pairs.size).toBe(6);
    expect(Math.max(...matches.map((m) => m.round!))).toBe(3);
  });

  it("zet een team nooit twee keer in dezelfde ronde", () => {
    for (const n of [4, 5, 6, 8]) {
      const ids = Array.from({ length: n }, (_, i) => `t${i}`);
      const matches = roundRobin(ids);
      const perRound = new Map<number, string[]>();
      for (const m of matches) {
        const list = perRound.get(m.round!) ?? [];
        list.push((m.a as any).teamId, (m.b as any).teamId);
        perRound.set(m.round!, list);
      }
      for (const [, teams] of perRound) {
        expect(new Set(teams).size).toBe(teams.length);
      }
    }
  });

  it("werkt met oneven aantal teams (bye)", () => {
    const matches = roundRobin(["a", "b", "c", "d", "e"]);
    expect(matches).toHaveLength(10); // 5 over 2 = 10 wedstrijden
    const count: Record<string, number> = {};
    for (const m of matches) {
      count[(m.a as any).teamId] = (count[(m.a as any).teamId] ?? 0) + 1;
      count[(m.b as any).teamId] = (count[(m.b as any).teamId] ?? 0) + 1;
    }
    for (const id of ["a", "b", "c", "d", "e"]) expect(count[id]).toBe(4);
  });

  it("double round robin: iedereen speelt uit én thuis", () => {
    const matches = roundRobin(["a", "b", "c", "d"], true);
    expect(matches).toHaveLength(12);
    // elke geordende combinatie precies één keer
    const ordered = new Set(matches.map((m) => `${(m.a as any).teamId}>${(m.b as any).teamId}`));
    expect(ordered.size).toBe(12);
  });

  it("geeft niets terug bij minder dan 2 teams", () => {
    expect(roundRobin([])).toHaveLength(0);
    expect(roundRobin(["a"])).toHaveLength(0);
  });
});
