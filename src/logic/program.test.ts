import { describe, expect, it } from "vitest";
import type { Tournament } from "../types";
import { defaultPresentation, defaultScoring } from "../types";
import { buildFormat } from "./formats";
import { addMinutes, autoSchedule } from "./schedule";
import { allMatches } from "./resolve";
import { uid } from "./id";
import {
  addEvent,
  blockStart,
  fieldProgram,
  moveBlock,
  programConflicts,
  reflowEvents,
  removeEvent,
  setBlockStart,
  unplanMatch,
  unplannedProgram,
  updateEvent,
} from "./program";

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

const planned = () => autoSchedule(makeTournament());

describe("fieldProgram", () => {
  it("geeft de blokken van één veld op tijdsvolgorde", () => {
    const t = planned();
    const col = fieldProgram(t, "f0");
    expect(col.length).toBeGreaterThan(1);
    for (let i = 1; i < col.length; i++) {
      expect(blockStart(col[i])! >= blockStart(col[i - 1])!).toBe(true);
    }
  });
});

describe("addEvent / removeEvent / updateEvent", () => {
  it("voegt een pauze toe aan het einde van de kolom", () => {
    const t = planned();
    const col = fieldProgram(t, "f0");
    const last = col[col.length - 1];
    const ev = addEvent(t, "f0", "pauze", "Lunch", 30);
    expect(ev.start).toBe(addMinutes(blockStart(last)!, t.matchDuration + t.breakBetween));
    expect(fieldProgram(t, "f0").pop()!.id).toBe(ev.id);
  });

  it("een pauze midden in de kolom schuift alles eronder op", () => {
    const t = planned();
    const ev = addEvent(t, "f0", "pauze", "Pauze", 30);
    const before = fieldProgram(t, "f0")
      .filter((b) => b.id !== ev.id)
      .map((b) => ({ id: b.id, start: blockStart(b)! }));
    // pauze naar positie 2 slepen
    moveBlock(t, ev.id, "f0", 2);
    const after = fieldProgram(t, "f0");
    expect(after[2].id).toBe(ev.id);
    expect(blockStart(after[2])).toBe(before[2].start);
    // blokken boven de pauze staan stil, eronder schuiven ze 30 min op
    for (const b of after) {
      if (b.id === ev.id) continue;
      const prev = before.find((x) => x.id === b.id)!;
      const idx = after.findIndex((x) => x.id === b.id);
      if (idx < 2) expect(blockStart(b)).toBe(prev.start);
      else expect(blockStart(b)).toBe(addMinutes(prev.start, 30));
    }
  });

  it("verwijderen van een pauze trekt de tijden weer omhoog", () => {
    const t = planned();
    const before = fieldProgram(t, "f0").map((b) => ({ id: b.id, start: blockStart(b)! }));
    const ev = addEvent(t, "f0", "pauze", "Pauze", 20);
    moveBlock(t, ev.id, "f0", 1);
    removeEvent(t, ev.id);
    for (const b of fieldProgram(t, "f0")) {
      expect(blockStart(b)).toBe(before.find((x) => x.id === b.id)!.start);
    }
  });

  it("duur aanpassen hertijdt alleen de blokken eronder", () => {
    const t = planned();
    const ev = addEvent(t, "f0", "pauze", "Pauze", 10);
    moveBlock(t, ev.id, "f0", 1);
    const before = fieldProgram(t, "f0").map((b) => ({ id: b.id, start: blockStart(b)! }));
    updateEvent(t, ev.id, "Lange pauze", 25);
    const after = fieldProgram(t, "f0");
    expect(blockStart(after[0])).toBe(before[0].start);
    expect(blockStart(after[1])).toBe(before[1].start); // de pauze zelf
    for (let i = 2; i < after.length; i++) {
      expect(blockStart(after[i])).toBe(addMinutes(before[i].start, 15));
    }
  });
});

describe("moveBlock", () => {
  it("hersorteert binnen een veld en hertijdt de slots", () => {
    const t = planned();
    const before = fieldProgram(t, "f0");
    const times = before.map((b) => blockStart(b)!);
    const moved = before[2];
    moveBlock(t, moved.id, "f0", 0);
    const after = fieldProgram(t, "f0");
    expect(after[0].id).toBe(moved.id);
    // zelfde slottijden, andere bezetting
    expect(after.map((b) => blockStart(b)!)).toEqual(times);
    expect(after[1].id).toBe(before[0].id);
    expect(after[2].id).toBe(before[1].id);
  });

  it("verplaatst tussen velden: doel schuift op, bron sluit het gat", () => {
    const t = planned();
    const source = fieldProgram(t, "f0");
    const target = fieldProgram(t, "f1");
    const moved = source[1];
    const sourceTimes = source.map((b) => blockStart(b)!);
    const targetTimes = target.map((b) => blockStart(b)!);
    moveBlock(t, moved.id, "f1", 0);
    const newSource = fieldProgram(t, "f0");
    const newTarget = fieldProgram(t, "f1");
    // doelkolom: verplaatst blok bovenaan op de oude eerste slottijd
    expect(newTarget[0].id).toBe(moved.id);
    expect(blockStart(newTarget[0])).toBe(targetTimes[0]);
    expect(newTarget.length).toBe(target.length + 1);
    // bronkolom: gat gesloten, zelfde slots minus de laatste
    expect(newSource.length).toBe(source.length - 1);
    expect(newSource.map((b) => blockStart(b)!)).toEqual(sourceTimes.slice(0, -1));
  });

  it("plant een niet-geplande wedstrijd in op een veld", () => {
    const t = planned();
    const m = allMatches(t.divisions[0])[0];
    unplanMatch(t, m.id);
    expect(unplannedProgram(t).some((b) => b.id === m.id)).toBe(true);
    moveBlock(t, m.id, "f1", 1);
    expect(m.fieldId).toBe("f1");
    expect(m.start).toBeTruthy();
    expect(fieldProgram(t, "f1")[1].id).toBe(m.id);
    expect(unplannedProgram(t).some((b) => b.id === m.id)).toBe(false);
  });
});

describe("unplanMatch", () => {
  it("zet een wedstrijd terug naar niet gepland en sluit het gat", () => {
    const t = planned();
    const col = fieldProgram(t, "f0");
    const removed = col[0];
    const times = col.map((b) => blockStart(b)!);
    unplanMatch(t, removed.id);
    const after = fieldProgram(t, "f0");
    expect(after.length).toBe(col.length - 1);
    expect(after.map((b) => blockStart(b)!)).toEqual(times.slice(0, -1));
  });
});

describe("setBlockStart", () => {
  it("schuift alleen het blok zelf en alles eronder", () => {
    const t = planned();
    const col = fieldProgram(t, "f0");
    const before = col.map((b) => ({ id: b.id, start: blockStart(b)! }));
    setBlockStart(t, col[2].id, addMinutes(before[2].start, 60));
    const after = fieldProgram(t, "f0");
    expect(blockStart(after.find((b) => b.id === before[0].id)!)).toBe(before[0].start);
    expect(blockStart(after.find((b) => b.id === before[1].id)!)).toBe(before[1].start);
    expect(blockStart(after.find((b) => b.id === before[2].id)!)).toBe(addMinutes(before[2].start, 60));
    for (let i = 3; i < before.length; i++) {
      expect(blockStart(after.find((b) => b.id === before[i].id)!)).toBe(
        addMinutes(before[i].start, 60)
      );
    }
  });
});

describe("reflowEvents", () => {
  it("zet events na automatisch plannen terug rond hun oude tijd", () => {
    const t = planned();
    const ev = addEvent(t, "f0", "pauze", "Lunch", 30);
    moveBlock(t, ev.id, "f0", 2);
    const oldStarts: Record<string, string | undefined> = { [ev.id]: ev.start };
    autoSchedule(t);
    reflowEvents(t, oldStarts);
    const col = fieldProgram(t, "f0");
    const i = col.findIndex((b) => b.id === ev.id);
    expect(i).toBeGreaterThanOrEqual(0);
    // kolom is aaneengesloten: elk blok begint waar het vorige eindigt
    for (let k = 1; k < col.length; k++) {
      expect(blockStart(col[k])).toBe(
        addMinutes(blockStart(col[k - 1])!, k - 1 === i ? 30 : t.matchDuration + t.breakBetween)
      );
    }
  });
});

describe("programConflicts", () => {
  it("waarschuwt als een team op twee velden tegelijk staat", () => {
    const t = planned();
    const ms = allMatches(t.divisions[0]).filter(
      (m) => m.a.kind === "team" && m.b.kind === "team"
    );
    const first = ms[0];
    const other = ms.find(
      (m) =>
        m.id !== first.id &&
        [m.a, m.b].some(
          (s) => s.kind === "team" && [first.a, first.b].some((x) => x.kind === "team" && x.teamId === s.teamId)
        )
    )!;
    other.start = first.start;
    other.fieldId = first.fieldId === "f0" ? "f1" : "f0";
    const conflicts = programConflicts(t);
    expect(conflicts.get(first.id)?.length).toBeGreaterThan(0);
    expect(conflicts.get(other.id)?.length).toBeGreaterThan(0);
  });

  it("waarschuwt als een scheidsrechter dubbel geboekt is", () => {
    const t = planned();
    const [a, b] = allMatches(t.divisions[0]);
    a.start = "09:00";
    b.start = "09:10";
    a.fieldId = "f0";
    b.fieldId = "f1";
    a.refereeId = "r0";
    b.refereeId = "r0";
    const conflicts = programConflicts(t);
    expect(conflicts.get(a.id)?.some((m) => m.includes("Scheids 1"))).toBe(true);
    expect(conflicts.get(b.id)?.some((m) => m.includes("Scheids 1"))).toBe(true);
  });

  it("waarschuwt als een scheidsrechter buiten zijn beschikbaarheid gepland staat", () => {
    const t = planned();
    const [a] = allMatches(t.divisions[0]);
    a.start = "16:30";
    a.fieldId = "f0";
    a.refereeId = "r0";
    t.referees[0].availableUntil = "16:00";
    const conflicts = programConflicts(t);
    expect(conflicts.get(a.id)?.some((m) => m.includes("tot 16:00"))).toBe(true);
  });

  it("waarschuwt bij te korte teamrust als minTeamRest gezet is", () => {
    const t = planned();
    t.minTeamRest = 20;
    const ms = allMatches(t.divisions[0]);
    const first = ms[0];
    const second = ms.find(
      (m) =>
        m.id !== first.id &&
        [m.a, m.b].some(
          (s) => s.kind === "team" && [first.a, first.b].some((x) => x.kind === "team" && x.teamId === s.teamId)
        )
    )!;
    first.start = "09:00";
    first.fieldId = "f0";
    // wedstrijd duurt 15 min → 5 min rust, minder dan de 20 vereist
    second.start = "09:20";
    second.fieldId = "f1";
    const conflicts = programConflicts(t);
    expect(conflicts.get(second.id)?.some((m) => m.includes("min rust"))).toBe(true);
  });

  it("geen valse meldingen in een net gepland schema", () => {
    const t = planned();
    expect(programConflicts(t).size).toBe(0);
  });
});

describe("autoSchedule behoudt handmatige scheidsrechters", () => {
  it("laat een vooraf toegewezen scheidsrechter staan", () => {
    const t = makeTournament();
    const m = allMatches(t.divisions[0])[3];
    m.refereeId = "r1";
    autoSchedule(t);
    expect(m.refereeId).toBe("r1");
  });
});
