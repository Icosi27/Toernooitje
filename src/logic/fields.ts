import type { Division, Match, MapBlock, Tournament } from "../types";
import { uid } from "./id";
import { allMatches } from "./resolve";
import { addMinutes } from "./schedule";
import { isPlayed } from "./standings";

/**
 * Kies voor `parts` veldjes het raster (kolommen x rijen) waarvan de cellen
 * het meest op een echt veld lijken (breedte:hoogte ~ 1,4), met een straf
 * voor lege rastercellen bij aantallen als 5 of 7.
 */
export function bestGrid(w: number, h: number, parts: number): { cols: number; rows: number } {
  let best = { cols: parts, rows: 1 };
  let bestScore = Infinity;
  for (let rows = 1; rows <= parts; rows++) {
    const cols = Math.ceil(parts / rows);
    const cellAspect = w / cols / (h / rows);
    const leftover = cols * rows - parts;
    const score = Math.abs(Math.log(cellAspect / 1.4)) + leftover * 0.35;
    if (score < bestScore) {
      bestScore = score;
      best = { cols, rows };
    }
  }
  return best;
}

/**
 * Veld sluiten mét herverdeling: de nog niet gespeelde wedstrijden van dit
 * veld worden achteraan de andere velden bijgeplant (vroegst vrije veld
 * eerst, zonder een team dubbel te boeken). Gespeelde wedstrijden behouden
 * hun historische tijd; pauzes/events op het gesloten veld vervallen.
 * Geeft het aantal herverdeelde wedstrijden terug; 0 = niets te herverdelen.
 */
export function closeField(t: Tournament, fieldId: string): number {
  const remaining = t.fields.filter((f) => f.id !== fieldId);
  if (remaining.length === 0) return 0;
  const slotLen = t.matchDuration + t.breakBetween;

  const displaced: { m: Match; d: Division }[] = [];
  const busyByTeam: Record<string, [string, string][]> = {};
  const nextFree: Record<string, string> = {};
  for (const f of remaining) nextFree[f.id] = f.startTime || t.startTime;

  for (const d of t.divisions) {
    for (const m of allMatches(d)) {
      if (!m.start) continue;
      if (m.fieldId === fieldId && !isPlayed(m)) {
        displaced.push({ m, d });
        continue;
      }
      const end = addMinutes(m.start, slotLen);
      if (m.fieldId && nextFree[m.fieldId] !== undefined && end > nextFree[m.fieldId])
        nextFree[m.fieldId] = end;
      for (const s of [m.a, m.b])
        if (s.kind === "team") (busyByTeam[s.teamId] ??= []).push([m.start, end]);
    }
  }

  const teamBusy = (tid: string, s: string, e: string) =>
    (busyByTeam[tid] ?? []).some(([bs, be]) => s < be && e > bs);

  displaced.sort((a, b) => a.m.start!.localeCompare(b.m.start!));
  for (const { m } of displaced) {
    let best = remaining[0].id;
    for (const f of remaining) if (nextFree[f.id] < nextFree[best]) best = f.id;
    const tids = [m.a, m.b].flatMap((s) => (s.kind === "team" ? [s.teamId] : []));
    let start = nextFree[best];
    let guard = 0;
    while (tids.some((tid) => teamBusy(tid, start, addMinutes(start, slotLen))) && guard++ < 200)
      start = addMinutes(start, slotLen);
    const end = addMinutes(start, slotLen);
    m.fieldId = best;
    m.start = start;
    nextFree[best] = end;
    for (const tid of tids) (busyByTeam[tid] ??= []).push([start, end]);
  }

  t.fields = remaining;
  t.scheduleEvents = (t.scheduleEvents ?? []).filter((e) => e.fieldId !== fieldId);
  return displaced.length;
}

/**
 * Splitst een fysiek veld in `parts` speelveldjes (2 t/m 12) — helften voor
 * 7x7, kwarten voor 4x4, of nog kleiner (6, 8, ... mini-veldjes). Elk deel is
 * daarna een eigen beplanbaar veld met een eigen programmakolom. Het
 * originele veld wordt deel "A" en behoudt zijn id, dus al geplande
 * wedstrijden en scheidsrechter-voorkeuren blijven kloppen. Staat het veld op
 * de plattegrond, dan wordt het blok in een gelijk raster opgedeeld.
 */
export function splitField(t: Tournament, fieldId: string, parts: number): void {
  parts = Math.max(2, Math.min(12, Math.round(parts)));
  const idx = t.fields.findIndex((f) => f.id === fieldId);
  if (idx < 0) return;
  const orig = t.fields[idx];
  const letters = "ABCDEFGHIJKL".split("");
  const baseName = orig.name;
  const subIds = [orig.id, ...Array.from({ length: parts - 1 }, () => uid())];

  orig.name = `${baseName} ${letters[0]}`;
  const extra = subIds.slice(1).map((id, i) => ({
    id,
    name: `${baseName} ${letters[i + 1]}`,
    startTime: orig.startTime,
    location: orig.location,
  }));
  t.fields.splice(idx + 1, 0, ...extra);

  // een scheidsrechter met voorkeur voor het hele veld mag op alle delen fluiten
  for (const r of t.referees) {
    if (r.fieldIds?.includes(orig.id)) r.fieldIds = [...r.fieldIds, ...subIds.slice(1)];
  }

  // plattegrond: het veldblok in een gelijk raster knippen
  const blocks = t.venueMap?.blocks;
  if (!blocks) return;
  const bi = blocks.findIndex((b) => b.kind === "field" && b.fieldId === orig.id);
  if (bi < 0) return;
  const b = blocks[bi];
  const { cols, rows } = bestGrid(b.w, b.h, parts);
  const cellW = b.w / cols;
  const cellH = b.h / rows;
  const newBlocks: MapBlock[] = subIds.map((fid, i) => ({
    id: i === 0 ? b.id : uid(),
    kind: "field",
    fieldId: fid,
    x: b.x + (i % cols) * cellW,
    y: b.y + Math.floor(i / cols) * cellH,
    w: cellW,
    h: cellH,
  }));
  blocks.splice(bi, 1, ...newBlocks);
}
