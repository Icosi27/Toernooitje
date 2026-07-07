import type { Division, ID, Match, ScheduleEvent, Tournament } from "../types";
import { allMatches, resolveSlot } from "./resolve";
import { addMinutes } from "./schedule";
import { uid } from "./id";

/**
 * Programma per veld: wedstrijden en events zijn samen één rij "blokken".
 * De opgeslagen starttijden blijven de waarheid (de rest van de app leest
 * m.start), maar elke planner-mutatie hertijdt de kolom sequentieel vanaf
 * het mutatiepunt: blok voor blok optellen (wedstrijdduur + rust, of
 * eventduur). Zo duwt een ingevoegde pauze alles eronder naar achteren en
 * schuift alles omhoog als er een blok verdwijnt.
 */
export type ProgramBlock =
  | { kind: "match"; id: ID; match: Match; division: Division }
  | { kind: "event"; id: ID; event: ScheduleEvent };

export function blockStart(b: ProgramBlock): string | undefined {
  return b.kind === "match" ? b.match.start : b.event.start;
}

function setStart(b: ProgramBlock, start: string | undefined) {
  if (b.kind === "match") b.match.start = start;
  else b.event.start = start;
}

/** Hoeveel minuten dit blok in de kolom inneemt. */
export function blockMinutes(t: Tournament, b: ProgramBlock): number {
  if (b.kind === "match") return t.matchDuration + t.breakBetween;
  return b.event.durationMin;
}

function fieldIdOf(b: ProgramBlock): ID | undefined {
  return b.kind === "match" ? b.match.fieldId : b.event.fieldId;
}

function setFieldId(b: ProgramBlock, fieldId: ID | undefined) {
  if (b.kind === "match") b.match.fieldId = fieldId;
  else b.event.fieldId = fieldId;
}

/** Alle blokken van het toernooi (wedstrijden + events), ongesorteerd. */
function allBlocks(t: Tournament): ProgramBlock[] {
  const out: ProgramBlock[] = [];
  for (const d of t.divisions)
    for (const m of allMatches(d)) out.push({ kind: "match", id: m.id, match: m, division: d });
  for (const e of t.scheduleEvents ?? []) out.push({ kind: "event", id: e.id, event: e });
  return out;
}

/** Geplande blokken van één veld, gesorteerd op starttijd (stabiel). */
export function fieldProgram(t: Tournament, fieldId: ID): ProgramBlock[] {
  return allBlocks(t)
    .filter((b) => fieldIdOf(b) === fieldId && blockStart(b) !== undefined)
    .sort((a, b) => (blockStart(a) ?? "99:99").localeCompare(blockStart(b) ?? "99:99"));
}

/** Blokken zonder veld of tijd: de parkeerplek "Niet gepland". */
export function unplannedProgram(t: Tournament): ProgramBlock[] {
  return allBlocks(t).filter((b) => fieldIdOf(b) === undefined || blockStart(b) === undefined);
}

export function findBlock(t: Tournament, blockId: ID): ProgramBlock | undefined {
  return allBlocks(t).find((b) => b.id === blockId);
}

function fieldStartTime(t: Tournament, fieldId: ID): string {
  return t.fields.find((f) => f.id === fieldId)?.startTime || t.startTime;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(n, hi));
}

/** Ken vanaf `from` sequentieel tijden toe, beginnend op `cursor`. */
function retimeSeq(t: Tournament, blocks: ProgramBlock[], from: number, cursor: string) {
  for (let i = from; i < blocks.length; i++) {
    setStart(blocks[i], cursor);
    cursor = addMinutes(cursor, blockMinutes(t, blocks[i]));
  }
}

/** Eind van het laatste blok, of de veldstart bij een lege kolom. */
function columnEnd(t: Tournament, fieldId: ID, blocks: ProgramBlock[]): string {
  const last = blocks[blocks.length - 1];
  return last ? addMinutes(blockStart(last)!, blockMinutes(t, last)) : fieldStartTime(t, fieldId);
}

/**
 * Verplaats een blok naar veld `targetFieldId` op positie `targetIndex`
 * (index in de kolom zonder het blok zelf). Alles onder het invoegpunt
 * schuift naar achteren; de bronkolom schuift omhoog in het gat.
 */
export function moveBlock(t: Tournament, blockId: ID, targetFieldId: ID, targetIndex: number) {
  const block = findBlock(t, blockId);
  if (!block) return;
  const sourceFieldId = fieldIdOf(block);
  const planned = blockStart(block) !== undefined && sourceFieldId !== undefined;

  if (planned && sourceFieldId === targetFieldId) {
    // hersorteren binnen dezelfde kolom
    const before = fieldProgram(t, targetFieldId);
    const oldIndex = before.findIndex((b) => b.id === blockId);
    if (oldIndex < 0) return;
    const arr = before.filter((b) => b.id !== blockId);
    const index = clamp(targetIndex, 0, arr.length);
    if (index === oldIndex) return;
    arr.splice(index, 0, block);
    const from = Math.min(oldIndex, index);
    retimeSeq(t, arr, from, blockStart(before[from])!);
    return;
  }

  // bronkolom vastleggen vóór de verplaatsing
  const oldStart = blockStart(block);
  let sourceRest: ProgramBlock[] = [];
  let sourceFrom = 0;
  if (planned && sourceFieldId) {
    const sourceBefore = fieldProgram(t, sourceFieldId);
    sourceFrom = sourceBefore.findIndex((b) => b.id === blockId);
    sourceRest = sourceBefore.filter((b) => b.id !== blockId);
  }

  // invoegen in de doelkolom
  const target = fieldProgram(t, targetFieldId).filter((b) => b.id !== blockId);
  const index = clamp(targetIndex, 0, target.length);
  const cursor = index < target.length ? blockStart(target[index])! : columnEnd(t, targetFieldId, target);
  setFieldId(block, targetFieldId);
  const arr = [...target];
  arr.splice(index, 0, block);
  retimeSeq(t, arr, index, cursor);

  // bronkolom omhoog laten schuiven in het vrijgekomen slot
  if (planned && sourceFieldId && oldStart !== undefined && sourceFrom >= 0) {
    retimeSeq(t, sourceRest, sourceFrom, oldStart);
  }
}

/** Haal een wedstrijd uit het schema, terug naar "Niet gepland". */
export function unplanMatch(t: Tournament, matchId: ID) {
  const block = findBlock(t, matchId);
  if (!block || block.kind !== "match") return;
  const { fieldId, start } = block.match;
  if (fieldId && start !== undefined) {
    const before = fieldProgram(t, fieldId);
    const i = before.findIndex((b) => b.id === matchId);
    const rest = before.filter((b) => b.id !== matchId);
    block.match.start = undefined;
    block.match.fieldId = undefined;
    if (i >= 0) retimeSeq(t, rest, i, start);
  } else {
    block.match.start = undefined;
    block.match.fieldId = undefined;
  }
}

/** Voeg een pauze of evenement toe onderaan een veldkolom. */
export function addEvent(
  t: Tournament,
  fieldId: ID,
  kind: ScheduleEvent["kind"],
  label: string,
  durationMin: number
): ScheduleEvent {
  const start = columnEnd(t, fieldId, fieldProgram(t, fieldId));
  const ev: ScheduleEvent = { id: uid(), kind, label, durationMin, fieldId, start, day: 0 };
  if (!t.scheduleEvents) t.scheduleEvents = [];
  t.scheduleEvents.push(ev);
  return ev;
}

/** Pas label/duur van een event aan en hertijd de kolom eronder. */
export function updateEvent(t: Tournament, eventId: ID, label: string, durationMin: number) {
  const ev = (t.scheduleEvents ?? []).find((e) => e.id === eventId);
  if (!ev) return;
  ev.label = label;
  ev.durationMin = durationMin;
  if (ev.fieldId && ev.start !== undefined) {
    const blocks = fieldProgram(t, ev.fieldId);
    const i = blocks.findIndex((b) => b.id === eventId);
    if (i >= 0) retimeSeq(t, blocks, i + 1, addMinutes(ev.start, ev.durationMin));
  }
}

export function removeEvent(t: Tournament, eventId: ID) {
  const ev = (t.scheduleEvents ?? []).find((e) => e.id === eventId);
  if (!ev) return;
  const { fieldId, start } = ev;
  if (fieldId && start !== undefined) {
    const before = fieldProgram(t, fieldId);
    const i = before.findIndex((b) => b.id === eventId);
    const rest = before.filter((b) => b.id !== eventId);
    t.scheduleEvents = (t.scheduleEvents ?? []).filter((e) => e.id !== eventId);
    if (i >= 0) retimeSeq(t, rest, i, start);
  } else {
    t.scheduleEvents = (t.scheduleEvents ?? []).filter((e) => e.id !== eventId);
  }
}

/** Zet handmatig een starttijd; alles onder dit blok schuift mee. */
export function setBlockStart(t: Tournament, blockId: ID, start: string) {
  const block = findBlock(t, blockId);
  if (!block) return;
  const fieldId = fieldIdOf(block);
  if (!fieldId) {
    setStart(block, start);
    return;
  }
  // volgorde vastleggen vóór de tijdwijziging: het blok houdt zijn plek
  // in de kolom en alles eronder sluit weer aan
  const blocks = fieldProgram(t, fieldId);
  const i = blocks.findIndex((b) => b.id === blockId);
  setStart(block, start);
  if (i >= 0) retimeSeq(t, blocks, i + 1, addMinutes(start, blockMinutes(t, block)));
}

/**
 * Na automatisch plannen: zet bestaande events terug in hun kolom op de
 * positie die het dichtst bij hun oude starttijd ligt, en hertijd.
 */
export function reflowEvents(t: Tournament, previousStarts: Record<ID, string | undefined>) {
  for (const ev of t.scheduleEvents ?? []) {
    if (!ev.fieldId || !t.fields.some((f) => f.id === ev.fieldId)) continue;
    const oldStart = previousStarts[ev.id] ?? ev.start;
    const column = fieldProgram(t, ev.fieldId).filter((b) => b.id !== ev.id);
    let index = column.length;
    if (oldStart !== undefined) {
      const at = column.findIndex((b) => (blockStart(b) ?? "99:99") >= oldStart);
      if (at >= 0) index = at;
    }
    moveBlock(t, ev.id, ev.fieldId, index);
  }
}

/**
 * Niet-blokkerende conflictdetectie: een team of scheidsrechter die op
 * hetzelfde moment op twee plekken staat. De organisator houdt regie —
 * dit levert alleen waarschuwingen op.
 */
export function programConflicts(t: Tournament): Map<ID, string[]> {
  interface Entry {
    id: ID;
    start: string;
    end: string;
    teams: { id: ID; name: string }[];
    refereeId?: ID;
  }
  const entries: Entry[] = [];
  for (const d of t.divisions) {
    for (const m of allMatches(d)) {
      if (!m.start || !m.fieldId) continue;
      const teams = [m.a, m.b]
        .map((s) => resolveSlot(s, d, t.scoring))
        .filter((x): x is NonNullable<typeof x> => x !== null)
        .map((team) => ({ id: team.id, name: team.name }));
      entries.push({
        id: m.id,
        start: m.start,
        end: addMinutes(m.start, t.matchDuration),
        teams,
        refereeId: m.refereeId,
      });
    }
  }
  const out = new Map<ID, string[]>();
  const push = (id: ID, msg: string) => out.set(id, [...(out.get(id) ?? []), msg]);
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i];
      const b = entries[j];
      if (a.start >= b.end || b.start >= a.end) continue; // geen overlap
      for (const ta of a.teams) {
        if (b.teams.some((tb) => tb.id === ta.id)) {
          push(a.id, `${ta.name} staat om ${b.start} ook elders gepland`);
          push(b.id, `${ta.name} staat om ${a.start} ook elders gepland`);
        }
      }
      if (a.refereeId && a.refereeId === b.refereeId) {
        const name = t.referees.find((r) => r.id === a.refereeId)?.name ?? "Scheidsrechter";
        push(a.id, `${name} fluit om ${b.start} ook een andere wedstrijd`);
        push(b.id, `${name} fluit om ${a.start} ook een andere wedstrijd`);
      }
    }
  }
  return out;
}
