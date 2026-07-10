import { describe, expect, it } from "vitest";
import type { Division, Match, Team } from "../types";
import { removeTeamEverywhere, teamInStages, withdrawTeam } from "./withdraw";

const team = (id: string): Team => ({ id, name: id.toUpperCase(), players: [] });
const m = (id: string, a: string, b: string, extra: Partial<Match> = {}): Match => ({
  id,
  a: { kind: "team", teamId: a },
  b: { kind: "team", teamId: b },
  ...extra,
});

function pouleDivision(): Division {
  return {
    id: "d1",
    name: "Divisie 1",
    individualMode: false,
    players: [],
    teams: [team("t1"), team("t2"), team("t3")],
    stages: [
      {
        id: "s1",
        type: "poules",
        name: "Groepsfase",
        poules: [
          {
            id: "p1",
            name: "Poule A",
            teamIds: ["t1", "t2", "t3"],
            matches: [
              m("m1", "t1", "t2", { scoreA: 2, scoreB: 1 }), // gespeeld
              m("m2", "t1", "t3"), // open
              m("m3", "t2", "t3"), // open, zonder t1
            ],
          },
        ],
      },
    ],
  };
}

describe("withdrawTeam", () => {
  it("kent openstaande wedstrijden reglementair toe aan de tegenstander", () => {
    const d = pouleDivision();
    const awarded = withdrawTeam(d, "t1");
    expect(awarded).toBe(1);
    const m2 = d.stages[0].type === "poules" ? d.stages[0].poules[0].matches[1] : undefined;
    expect(m2?.scoreA).toBe(0); // t1 (terugtrekker) verliest
    expect(m2?.scoreB).toBe(3);
  });

  it("laat gespeelde uitslagen en wedstrijden van anderen met rust", () => {
    const d = pouleDivision();
    withdrawTeam(d, "t1");
    const poule = d.stages[0].type === "poules" ? d.stages[0].poules[0] : undefined;
    expect(poule?.matches[0].scoreA).toBe(2); // gespeeld blijft 2-1
    expect(poule?.matches[0].scoreB).toBe(1);
    expect(poule?.matches[2].scoreA).toBeUndefined(); // t2-t3 blijft open
  });

  it("markeert het team als teruggetrokken", () => {
    const d = pouleDivision();
    withdrawTeam(d, "t1");
    expect(d.teams.find((t) => t.id === "t1")?.withdrawn).toBe(true);
  });

  it("slaat wedstrijden over waarvan de tegenstander nog onbekend is", () => {
    const d = pouleDivision();
    d.stages.push({
      id: "s2",
      type: "bracket",
      name: "Finale",
      size: 2,
      rounds: [
        {
          name: "Finale",
          matches: [
            {
              id: "f1",
              a: { kind: "team", teamId: "t1" },
              b: { kind: "pouleRank", pouleId: "p1", rank: 2 },
            },
          ],
        },
      ],
    });
    withdrawTeam(d, "t1");
    const finale = d.stages[1].type === "bracket" ? d.stages[1].rounds[0].matches[0] : undefined;
    expect(finale?.scoreA).toBeUndefined(); // geen walkover tegen een placeholder
  });
});

describe("removeTeamEverywhere", () => {
  it("verwijdert het team uit teams, poule-indeling en open wedstrijden", () => {
    const d = pouleDivision();
    removeTeamEverywhere(d, "t3");
    expect(d.teams.map((t) => t.id)).toEqual(["t1", "t2"]);
    const poule = d.stages[0].type === "poules" ? d.stages[0].poules[0] : undefined;
    expect(poule?.teamIds).toEqual(["t1", "t2"]);
    expect(poule?.matches.map((x) => x.id)).toEqual(["m1"]); // alleen de gespeelde blijft
  });

  it("houdt gespeelde wedstrijden aan, ook van het verwijderde team", () => {
    const d = pouleDivision();
    removeTeamEverywhere(d, "t2");
    const poule = d.stages[0].type === "poules" ? d.stages[0].poules[0] : undefined;
    // m1 (gespeeld, met t2) blijft; m2 (t1-t3, zonder t2) blijft; m3 (open, met t2) verdwijnt
    expect(poule?.matches.map((x) => x.id)).toEqual(["m1", "m2"]);
    expect(poule?.matches[0].scoreA).toBe(2);
  });

  it("zet bracket-plekken van het team terug naar n.t.b.", () => {
    const d = pouleDivision();
    d.stages.push({
      id: "s2",
      type: "bracket",
      name: "Finale",
      size: 2,
      rounds: [{ name: "Finale", matches: [m("f1", "t1", "t2")] }],
    });
    removeTeamEverywhere(d, "t1");
    const finale = d.stages[1].type === "bracket" ? d.stages[1].rounds[0].matches[0] : undefined;
    expect(finale?.a).toEqual({ kind: "tbd" });
    expect(finale?.b).toEqual({ kind: "team", teamId: "t2" });
  });
});

describe("teamInStages", () => {
  it("herkent teams in een indeling en teams zonder indeling", () => {
    const d = pouleDivision();
    expect(teamInStages(d, "t1")).toBe(true);
    d.teams.push(team("t4"));
    expect(teamInStages(d, "t4")).toBe(false);
  });
});
