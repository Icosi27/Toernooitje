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

describe("scheidsrechter-voorkeuren", () => {
  it("respecteert de veldbeperking van een scheidsrechter", () => {
    const t = makeTournament(8, 2, 2);
    t.referees[0].fieldIds = ["f0"];
    t.referees[1].fieldIds = ["f1"];
    autoSchedule(t);
    for (const d of t.divisions)
      for (const m of allMatches(d)) {
        if (m.refereeId === "r0") expect(m.fieldId).toBe("f0");
        if (m.refereeId === "r1") expect(m.fieldId).toBe("f1");
      }
  });

  it("respecteert de divisiebeperking van een scheidsrechter", () => {
    const t = makeTournament(8, 2, 2);
    const andereDivisie = "niet-bestaande-divisie";
    t.referees[0].divisionIds = [andereDivisie]; // mag nergens fluiten
    autoSchedule(t);
    for (const d of t.divisions)
      for (const m of allMatches(d)) expect(m.refereeId).not.toBe("r0");
  });

  it("respecteert het maximum aantal wedstrijden", () => {
    const t = makeTournament(8, 2, 2);
    t.referees[0].maxMatches = 3;
    autoSchedule(t);
    const count = t.divisions
      .flatMap((d) => allMatches(d))
      .filter((m) => m.refereeId === "r0").length;
    expect(count).toBeLessThanOrEqual(3);
  });

  it("plant een scheidsrechter niet buiten zijn beschikbaarheidsvenster", () => {
    const t = makeTournament(8, 2, 2);
    // r0 moet om 10:00 weg en is er pas vanaf 09:20; r1 kan de hele dag
    t.referees[0].availableFrom = "09:20";
    t.referees[0].availableUntil = "10:00";
    autoSchedule(t);
    const mine = t.divisions
      .flatMap((d) => allMatches(d))
      .filter((m) => m.refereeId === "r0");
    expect(mine.length).toBeGreaterThan(0); // hij fluit wél binnen het venster
    for (const m of mine) {
      expect(m.start! >= "09:20").toBe(true);
      expect(addMinutes(m.start!, t.matchDuration) <= "10:00").toBe(true);
    }
  });
});

describe("teams als scheidsrechters", () => {
  it("wijst fluitende teams toe die zelf niet spelen op dat moment", () => {
    const t = makeTournament(8, 2, 0);
    t.teamsAsReferees = true;
    autoSchedule(t);
    const slotLen = t.matchDuration + t.breakBetween;
    const all = t.divisions.flatMap((d) => allMatches(d));
    let assigned = 0;
    for (const m of all) {
      if (!m.refereeTeamId) continue;
      assigned++;
      // het fluitende team speelt niet mee in deze wedstrijd
      for (const s of [m.a, m.b])
        if (s.kind === "team") expect(s.teamId).not.toBe(m.refereeTeamId);
      // en heeft geen eigen wedstrijd die overlapt
      const end = addMinutes(m.start!, slotLen);
      for (const other of all) {
        if (other.id === m.id || !other.start) continue;
        const participates = [other.a, other.b].some(
          (s) => s.kind === "team" && s.teamId === m.refereeTeamId
        );
        if (!participates) continue;
        const otherEnd = addMinutes(other.start, slotLen);
        expect(m.start! >= otherEnd || end <= other.start).toBe(true);
      }
    }
    expect(assigned).toBeGreaterThan(0);
  });

  it("verdeelt de fluitbeurten eerlijk", () => {
    const t = makeTournament(8, 2, 0);
    t.teamsAsReferees = true;
    autoSchedule(t);
    const counts: Record<string, number> = {};
    for (const d of t.divisions)
      for (const m of allMatches(d))
        if (m.refereeTeamId) counts[m.refereeTeamId] = (counts[m.refereeTeamId] ?? 0) + 1;
    const values = Object.values(counts);
    expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(2);
  });

  it("laat vaste scheidsrechters ongemoeid als de schakelaar uit staat", () => {
    const t = makeTournament(8, 2, 2);
    autoSchedule(t);
    const all = t.divisions.flatMap((d) => allMatches(d));
    expect(all.every((m) => !m.refereeTeamId)).toBe(true);
    expect(all.some((m) => m.refereeId)).toBe(true);
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

  it("schuift met een fieldId alleen dat veld op", () => {
    const t = autoSchedule(makeTournament(8, 2));
    const fieldA = t.fields[0].id;
    const rows = scheduledMatches(t);
    const onA = rows.filter((r) => r.match.fieldId === fieldA);
    const onB = rows.filter((r) => r.match.fieldId !== fieldA);
    expect(onA.length).toBeGreaterThan(0);
    expect(onB.length).toBeGreaterThan(0);
    const beforeA = onA.map((r) => r.match.start);
    const beforeB = onB.map((r) => r.match.start);
    const count = shiftSchedule(t, 15, fieldA);
    expect(count).toBe(onA.length);
    onA.forEach((r, i) => expect(r.match.start).toBe(addMinutes(beforeA[i]!, 15)));
    onB.forEach((r, i) => expect(r.match.start).toBe(beforeB[i]));
  });
});
