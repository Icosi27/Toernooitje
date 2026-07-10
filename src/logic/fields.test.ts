import { describe, expect, it } from "vitest";
import type { Tournament } from "../types";
import { defaultPresentation, defaultScoring } from "../types";
import { bestGrid, closeField, splitField } from "./fields";
import { uid } from "./id";

function makeTournament(): Tournament {
  return {
    id: uid(),
    name: "Test",
    createdAt: "2026-01-01",
    days: ["2026-06-01"],
    locations: [],
    esport: false,
    divisions: [],
    sport: "Voetbal",
    scoring: defaultScoring(),
    fields: [
      { id: "f1", name: "Veld 1", startTime: "09:30" },
      { id: "f2", name: "Veld 2" },
    ],
    referees: [{ id: "r1", name: "Scheids", fieldIds: ["f1"] }],
    admins: [],
    matchDuration: 15,
    breakBetween: 5,
    startTime: "09:00",
    presentation: defaultPresentation(),
    venueMap: {
      blocks: [
        { id: "b1", kind: "field", fieldId: "f1", x: 100, y: 100, w: 400, h: 200 },
        { id: "b2", kind: "kantine", x: 600, y: 100, w: 140, h: 90 },
      ],
    },
  };
}

describe("bestGrid", () => {
  it("kiest veldvormige rasters voor een liggend veld (400x200)", () => {
    expect(bestGrid(400, 200, 2)).toEqual({ cols: 2, rows: 1 });
    expect(bestGrid(400, 200, 4)).toEqual({ cols: 2, rows: 2 });
    expect(bestGrid(400, 200, 6)).toEqual({ cols: 3, rows: 2 });
    expect(bestGrid(400, 200, 8)).toEqual({ cols: 4, rows: 2 });
  });

  it("draait mee met een staand veld", () => {
    const g = bestGrid(200, 400, 2);
    expect(g.rows).toBeGreaterThan(g.cols);
  });
});

describe("splitField", () => {
  it("splitst in 2 helften: A behoudt het id, B komt ernaast", () => {
    const t = makeTournament();
    splitField(t, "f1", 2);
    expect(t.fields.map((f) => f.name)).toEqual(["Veld 1 A", "Veld 1 B", "Veld 2"]);
    expect(t.fields[0].id).toBe("f1"); // geplande wedstrijden blijven kloppen
    expect(t.fields[1].startTime).toBe("09:30"); // erft de starttijd
  });

  it("splitst in 4 kwarten voor 4x4", () => {
    const t = makeTournament();
    splitField(t, "f1", 4);
    expect(t.fields.map((f) => f.name)).toEqual([
      "Veld 1 A",
      "Veld 1 B",
      "Veld 1 C",
      "Veld 1 D",
      "Veld 2",
    ]);
  });

  it("breidt de veldvoorkeur van scheidsrechters uit naar alle delen", () => {
    const t = makeTournament();
    splitField(t, "f1", 2);
    const ref = t.referees[0];
    expect(ref.fieldIds).toHaveLength(2);
    expect(ref.fieldIds).toContain("f1");
    expect(ref.fieldIds).toContain(t.fields[1].id);
  });

  it("deelt het plattegrond-blok in gelijke delen binnen het origineel", () => {
    const t = makeTournament();
    splitField(t, "f1", 4);
    const fieldBlocks = t.venueMap!.blocks.filter((b) => b.kind === "field");
    expect(fieldBlocks).toHaveLength(4);
    const area = fieldBlocks.reduce((s, b) => s + b.w * b.h, 0);
    expect(area).toBe(400 * 200); // samen precies het originele oppervlak
    for (const b of fieldBlocks) {
      expect(b.x).toBeGreaterThanOrEqual(100);
      expect(b.y).toBeGreaterThanOrEqual(100);
      expect(b.x + b.w).toBeLessThanOrEqual(500);
      expect(b.y + b.h).toBeLessThanOrEqual(300);
    }
    // elk deel is aan een eigen veld gekoppeld
    expect(new Set(fieldBlocks.map((b) => b.fieldId)).size).toBe(4);
    // de kantine blijft staan
    expect(t.venueMap!.blocks.some((b) => b.kind === "kantine")).toBe(true);
  });

  it("splitst ook in 6 of 8 mini-veldjes", () => {
    const t = makeTournament();
    splitField(t, "f1", 6);
    expect(t.fields.map((f) => f.name).slice(0, 6)).toEqual([
      "Veld 1 A",
      "Veld 1 B",
      "Veld 1 C",
      "Veld 1 D",
      "Veld 1 E",
      "Veld 1 F",
    ]);
    const fieldBlocks = t.venueMap!.blocks.filter((b) => b.kind === "field");
    expect(fieldBlocks).toHaveLength(6);
    const area = fieldBlocks.reduce((s, b) => s + b.w * b.h, 0);
    expect(area).toBeCloseTo(400 * 200); // 3x2-raster vult het hele veld
  });

  it("klemt het aantal op 2 t/m 12", () => {
    const t = makeTournament();
    splitField(t, "f1", 99);
    expect(t.fields.filter((f) => f.name.startsWith("Veld 1"))).toHaveLength(12);
  });

  it("laat alles met rust bij een onbekend veld", () => {
    const t = makeTournament();
    splitField(t, "bestaat-niet", 2);
    expect(t.fields).toHaveLength(2);
    expect(t.venueMap!.blocks).toHaveLength(2);
  });
});

describe("closeField", () => {
  const division = () => ({
    id: "d1",
    name: "Divisie 1",
    individualMode: false,
    players: [],
    teams: [
      { id: "t1", name: "T1", players: [] },
      { id: "t2", name: "T2", players: [] },
      { id: "t3", name: "T3", players: [] },
      { id: "t4", name: "T4", players: [] },
    ],
    stages: [
      {
        id: "s1",
        type: "poules" as const,
        name: "Poule",
        poules: [
          {
            id: "p1",
            name: "Poule A",
            teamIds: ["t1", "t2", "t3", "t4"],
            matches: [
              // gespeeld op f2 (blijft), open op f2 (herverdelen), open op f1 (blijft op f1)
              { id: "m1", a: { kind: "team" as const, teamId: "t1" }, b: { kind: "team" as const, teamId: "t2" }, fieldId: "f2", start: "09:00", scoreA: 1, scoreB: 0 },
              { id: "m2", a: { kind: "team" as const, teamId: "t3" }, b: { kind: "team" as const, teamId: "t4" }, fieldId: "f2", start: "09:20" },
              { id: "m3", a: { kind: "team" as const, teamId: "t1" }, b: { kind: "team" as const, teamId: "t3" }, fieldId: "f1", start: "09:30" },
            ],
          },
        ],
      },
    ],
  });

  it("herverdeelt open wedstrijden over de andere velden zonder teamconflict", () => {
    const t = makeTournament();
    t.divisions = [division() as never];
    const moved = closeField(t, "f2");
    expect(moved).toBe(1);
    expect(t.fields.map((f) => f.id)).toEqual(["f1"]);
    const poule = (t.divisions[0].stages[0] as { poules: { matches: import("../types").Match[] }[] }).poules[0];
    const m1 = poule.matches[0];
    const m2 = poule.matches[1];
    const m3 = poule.matches[2];
    // gespeelde wedstrijd behoudt zijn historie
    expect(m1.start).toBe("09:00");
    expect(m1.fieldId).toBe("f2");
    // open wedstrijd verhuist naar f1, ná de al geplande wedstrijd daar
    expect(m2.fieldId).toBe("f1");
    expect(m2.start! >= "09:50").toBe(true);
    // en de bestaande wedstrijd op f1 blijft staan
    expect(m3.start).toBe("09:30");
    expect(m3.fieldId).toBe("f1");
  });

  it("doet niets als er geen ander veld over is", () => {
    const t = makeTournament();
    t.fields = [{ id: "f2", name: "Veld 2" }];
    t.divisions = [division() as never];
    expect(closeField(t, "f2")).toBe(0);
    expect(t.fields.length).toBe(1);
  });
});
