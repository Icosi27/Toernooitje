import { describe, expect, it } from "vitest";
import type { Division } from "../types";
import { defaultScoring } from "../types";
import { buildFormat, seedKnockoutWithTeams } from "./formats";
import {
  bracketReadiness,
  gatedMatchIds,
  pouleRankOptions,
  seedingIssues,
  stageProgress,
  startBracketStage,
} from "./phases";
import { pouleStandings } from "./standings";
import { uid } from "./id";

function wkDivision(teams = 8): Division {
  const d: Division = {
    id: uid(),
    name: "Divisie 1",
    teams: Array.from({ length: teams }, (_, i) => ({ id: `t${i}`, name: `Team ${i}`, players: [] })),
    players: [],
    individualMode: false,
    stages: [],
  };
  d.stages = buildFormat(d, "wk", { pouleCount: 2, koSize: 4 });
  return d;
}

/** hoger teamnummer wint altijd; laat `leave` wedstrijden open */
function playPoules(d: Division, leave = 0) {
  let left = leave;
  for (const s of d.stages) {
    if (s.type !== "poules") continue;
    for (const p of s.poules) {
      for (const m of p.matches) {
        if (left > 0) {
          left--;
          continue;
        }
        const a = (m.a as any).teamId as string;
        const b = (m.b as any).teamId as string;
        m.scoreA = a > b ? 2 : 0;
        m.scoreB = a > b ? 0 : 2;
      }
    }
  }
}

describe("stageProgress", () => {
  it("telt gespeelde wedstrijden per fase (bijv. 11/12)", () => {
    const d = wkDivision();
    playPoules(d, 1);
    const prog = stageProgress(d.stages[0]);
    expect(prog.total).toBe(12); // 2 poules van 4 = 2x6
    expect(prog.done).toBe(11);
  });
});

describe("bracketReadiness", () => {
  it("meldt hoeveel uitslagen er nog missen", () => {
    const d = wkDivision();
    playPoules(d, 3);
    const ko = d.stages[1];
    if (ko.type !== "bracket") throw new Error();
    const r = bracketReadiness(d, ko);
    expect(r.hasSources).toBe(true);
    expect(r.ready).toBe(false);
    expect(r.missing).toBe(3);
  });

  it("is klaar zodra alle voedende poules compleet zijn", () => {
    const d = wkDivision();
    playPoules(d);
    const ko = d.stages[1];
    if (ko.type !== "bracket") throw new Error();
    expect(bracketReadiness(d, ko)).toMatchObject({ ready: true, missing: 0 });
  });
});

describe("startBracketStage", () => {
  it("weigert te starten zolang de poules niet compleet zijn", () => {
    const d = wkDivision();
    playPoules(d, 1);
    expect(startBracketStage(d, d.stages[1].id, defaultScoring())).toBe(false);
    const ko = d.stages[1];
    if (ko.type !== "bracket") throw new Error();
    expect(ko.started).toBeFalsy();
  });

  it("zet poule-plaatsingen om in echte teams volgens de eindstand", () => {
    const d = wkDivision();
    playPoules(d); // hoogste teamnummer wint -> nr. 1 is het 'hoogste' team per poule
    const ok = startBracketStage(d, d.stages[1].id, defaultScoring());
    expect(ok).toBe(true);
    const ko = d.stages[1];
    if (ko.type !== "bracket") throw new Error();
    expect(ko.started).toBe(true);
    const firstRoundSlots = ko.rounds[0].matches.flatMap((m) => [m.a, m.b]);
    expect(firstRoundSlots.every((s) => s.kind === "team")).toBe(true);
    // 4 verschillende teams in de halve finales
    expect(new Set(firstRoundSlots.map((s: any) => s.teamId)).size).toBe(4);
  });

  it("start niet twee keer", () => {
    const d = wkDivision();
    playPoules(d);
    expect(startBracketStage(d, d.stages[1].id, defaultScoring())).toBe(true);
    expect(startBracketStage(d, d.stages[1].id, defaultScoring())).toBe(false);
  });
});

describe("pouleRankOptions", () => {
  it("biedt elke plek van elke poule aan", () => {
    const d = wkDivision(); // 2 poules van 4
    const opts = pouleRankOptions(d);
    expect(opts.length).toBe(8);
    expect(opts.filter((o) => o.rank === 3).length).toBe(2);
  });
});

describe("handmatige KO-koppelingen", () => {
  it("een aangepaste koppeling (Nr. 1 tegen Nr. 3) stroomt correct door bij de start", () => {
    const d = wkDivision();
    const ko = d.stages[1];
    if (ko.type !== "bracket") throw new Error();
    const poules = d.stages[0].type === "poules" ? d.stages[0].poules : [];
    // organisator zet halve finale 1 om naar Nr. 1 Poule A - Nr. 3 Poule B
    ko.rounds[0].matches[0].a = { kind: "pouleRank", pouleId: poules[0].id, rank: 1 };
    ko.rounds[0].matches[0].b = { kind: "pouleRank", pouleId: poules[1].id, rank: 3 };
    playPoules(d);
    expect(startBracketStage(d, ko.id, defaultScoring())).toBe(true);
    const expectA = pouleStandings(poules[0], defaultScoring())[0].teamId;
    const expectB = pouleStandings(poules[1], defaultScoring())[2].teamId;
    expect((ko.rounds[0].matches[0].a as any).teamId).toBe(expectA);
    expect((ko.rounds[0].matches[0].b as any).teamId).toBe(expectB);
  });

  it("seedingIssues waarschuwt bij dubbele plaatsingen en N.t.b.-plekken", () => {
    const d = wkDivision();
    const ko = d.stages[1];
    if (ko.type !== "bracket") throw new Error();
    expect(seedingIssues(d, ko)).toEqual([]); // standaard-seeding is schoon
    const poules = d.stages[0].type === "poules" ? d.stages[0].poules : [];
    ko.rounds[0].matches[0].a = { kind: "pouleRank", pouleId: poules[0].id, rank: 1 };
    ko.rounds[0].matches[1].a = { kind: "pouleRank", pouleId: poules[0].id, rank: 1 };
    ko.rounds[0].matches[1].b = { kind: "tbd" };
    const issues = seedingIssues(d, ko);
    expect(issues.some((i) => i.includes("2×"))).toBe(true);
    expect(issues.some((i) => i.includes("N.t.b."))).toBe(true);
  });
});

describe("gatedMatchIds", () => {
  it("schermt KO-wedstrijden af tot de fase gestart is", () => {
    const d = wkDivision();
    const before = gatedMatchIds([d]);
    expect(before.size).toBe(4); // 2 halve finales + troostfinale + finale
    playPoules(d);
    startBracketStage(d, d.stages[1].id, defaultScoring());
    expect(gatedMatchIds([d]).size).toBe(0);
  });

  it("laat een pure knock-out (zonder poules) met rust", () => {
    const d: Division = {
      id: uid(),
      name: "KO",
      teams: Array.from({ length: 4 }, (_, i) => ({ id: `t${i}`, name: `T${i}`, players: [] })),
      players: [],
      individualMode: false,
      stages: [],
    };
    d.stages = buildFormat(d, "knockout", { koSize: 4 });
    seedKnockoutWithTeams(d.stages[0], d);
    expect(gatedMatchIds([d]).size).toBe(0);
  });
});
