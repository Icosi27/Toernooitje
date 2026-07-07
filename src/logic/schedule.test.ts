import { describe, expect, it } from "vitest";
import type { Tournament } from "../types";
import { defaultPresentation, defaultScoring } from "../types";
import { buildFormat } from "./formats";
import { addMinutes, autoSchedule, scheduledMatches, shiftSchedule } from "./schedule";
import { allMatches } from "./resolve";
import { uid } from "./id";

function makeTournament(teamCount = 8, fieldCount = 2, refCount = 2): Tournament {
  const division = {
    id: uid(),
    name: "Divisie 1",
    teams: Array.from({ length: teamCount }, (_, i) => ({ id: `t${i}`, name: `Team ${i}`, players: [] })),
    players: [],
    individualMode: false,
    stages: [] as any[],
  };
  division.stages = buildFormat(division as any, "competitie", {});
  return {
    id: uid(),
    name: "Test",
    createdAt: "2026-01-01",
    days: ["2026-06-01"],
    locations: [],
    esport: false,
    divisions: [division as any],
    sport: "Voetbal",
    scoring: defaultScoring(),
    fields: Array.from({ length: fieldCount }, (_, i) => ({ id: `f${i}`, name: `Veld ${i + 1}` })),
    referees: Array.from({ length: refCount }, (_, i) => ({ id: `r${i}`, name: `Scheids ${i + 1}` })),
    admins: [],
    matchDuration: 15,
    breakBetween: 5,
    startTime: "09:00",
    presentation: defaultPresentation(),
  };
}

describe("addMinutes", () => {
  it("telt minuten op bij een kloktijd", () => {
    expect(addMinutes("09:00", 20)).toBe("09:20");
    expect(addMinutes("09:50", 15)).toBe("10:05");
    expect(addMinutes("10:10", -15)).toBe("09:55");
  });
});

describe("autoSchedule", () => {
  it("plant alle wedstrijden in met veld en tijd", () => {
    const t = autoSchedule(makeTournament());
    for (const d of t.divisions)
      for (const m of allMatches(d)) {
        expect(m.start).toBeTruthy();
        expect(m.fieldId).toBeTruthy();
      }
  });

  it("zet een team nooit op twee velden tegelijk", () => {
    const t = autoSchedule(makeTournament(8, 4));
    const slotLen = t.matchDuration + t.breakBetween;
    const busy: Record<string, [string, string][]> = {};
    for (const d of t.divisions)
      for (const m of allMatches(d)) {
        const end = addMinutes(m.start!, slotLen);
        for (const slot of [m.a, m.b]) {
          if (slot.kind !== "team") continue;
          for (const [s, e] of busy[slot.teamId] ?? []) {
            expect(m.start! >= e || end <= s).toBe(true);
          }
          (busy[slot.teamId] ??= []).push([m.start!, end]);
        }
      }
  });

  it("boekt een scheidsrechter nooit dubbel", () => {
    const t = autoSchedule(makeTournament(8, 4, 2));
    const slotLen = t.matchDuration + t.breakBetween;
    const busy: Record<string, [string, string][]> = {};
    for (const d of t.divisions)
      for (const m of allMatches(d)) {
        if (!m.refereeId) continue;
        const end = addMinutes(m.start!, slotLen);
        for (const [s, e] of busy[m.refereeId] ?? []) {
          expect(m.start! >= e || end <= s).toBe(true);
        }
        (busy[m.refereeId] ??= []).push([m.start!, end]);
      }
  });

  it("respecteert de starttijd van het toernooi", () => {
    const t = autoSchedule(makeTournament());
    const times = scheduledMatches(t).map((r) => r.match.start!);
    expect(times[0]).toBe("09:00");
  });
});

describe("shiftSchedule", () => {
  it("schuift alleen niet-gespeelde wedstrijden op", () => {
    const t = autoSchedule(makeTournament(4, 1));
    const rows = scheduledMatches(t);
    const first = rows[0].match;
    const second = rows[1].match;
    first.scoreA = 1;
    first.scoreB = 0;
    const beforeFirst = first.start;
    const beforeSecond = second.start;
    const count = shiftSchedule(t, 10);
    expect(count).toBeGreaterThan(0);
    expect(first.start).toBe(beforeFirst);
    expect(second.start).toBe(addMinutes(beforeSecond!, 10));
  });
});
