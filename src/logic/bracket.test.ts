import { describe, expect, it } from "vitest";
import { buildBracket, roundName } from "./bracket";
import { roundRobin } from "./roundrobin";
import type { Poule } from "../types";

const makePoule = (id: string, teams: string[]): Poule => ({
  id,
  name: `Poule ${id}`,
  teamIds: teams,
  matches: roundRobin(teams),
});

describe("roundName", () => {
  it("benoemt de rondes correct", () => {
    expect(roundName(2)).toBe("Finale");
    expect(roundName(4)).toBe("Halve finale");
    expect(roundName(8)).toBe("Kwartfinale");
    expect(roundName(16)).toBe("Achtste finale");
    expect(roundName(32)).toBe("Ronde van 32");
  });
});

describe("buildBracket", () => {
  it("bouwt een 8-bracket met kwart-, halve, troost- en finale", () => {
    const b = buildBracket(8, []);
    expect(b.rounds.map((r) => r.name)).toEqual([
      "Kwartfinale",
      "Halve finale",
      "Troostfinale",
      "Finale",
    ]);
    expect(b.rounds[0].matches).toHaveLength(4);
    expect(b.rounds[1].matches).toHaveLength(2);
    expect(b.rounds[2].matches).toHaveLength(1);
    expect(b.rounds[3].matches).toHaveLength(1);
  });

  it("laat winnaars doorstromen en verliezers naar de troostfinale", () => {
    const b = buildBracket(4, []);
    const [halve, troost, finale] = b.rounds;
    for (const slot of [finale.matches[0].a, finale.matches[0].b]) {
      expect(slot.kind).toBe("winner");
    }
    for (const slot of [troost.matches[0].a, troost.matches[0].b]) {
      expect(slot.kind).toBe("loser");
    }
    const winnerIds = [finale.matches[0].a, finale.matches[0].b].map((s: any) => s.matchId);
    expect(winnerIds).toEqual(halve.matches.map((m) => m.id));
  });

  it("seedt kruislings vanuit poules: nooit twee teams uit dezelfde poule of met dezelfde rank", () => {
    const poules = [
      makePoule("A", ["a1", "a2", "a3", "a4"]),
      makePoule("B", ["b1", "b2", "b3", "b4"]),
      makePoule("C", ["c1", "c2", "c3", "c4"]),
      makePoule("D", ["d1", "d2", "d3", "d4"]),
    ];
    const b = buildBracket(8, poules);
    for (const m of b.rounds[0].matches) {
      expect(m.a.kind).toBe("pouleRank");
      expect(m.b.kind).toBe("pouleRank");
      const a = m.a as any;
      const bb = m.b as any;
      expect(a.pouleId).not.toBe(bb.pouleId);
      expect(a.rank).not.toBe(bb.rank);
    }
    // alle 8 kwalificatieplekken (4 poules x rank 1-2) komen precies één keer voor
    const seen = new Set(
      b.rounds[0].matches.flatMap((m) => [m.a, m.b]).map((s: any) => `${s.pouleId}#${s.rank}`)
    );
    expect(seen.size).toBe(8);
  });

  it("bouwt een 2-bracket als alleen een finale", () => {
    const b = buildBracket(2, [], false);
    expect(b.rounds).toHaveLength(1);
    expect(b.rounds[0].name).toBe("Finale");
  });
});
