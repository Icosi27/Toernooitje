import type { Division, Match, Tournament } from "../types";
import { allMatches } from "./resolve";

/** "HH:MM" + minuten -> "HH:MM" */
export function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/**
 * Automatische planner: verdeelt alle wedstrijden (alle divisies, in fase- en
 * rondevolgorde) over de velden. Latere fases (KO) komen na de poules.
 * Wedstrijden binnen dezelfde speelronde worden zoveel mogelijk parallel gezet.
 */
export function autoSchedule(t: Tournament): Tournament {
  if (t.fields.length === 0) return t;
  const slotLen = t.matchDuration + t.breakBetween;

  // per veld de eerstvolgende vrije tijd
  const nextFree: Record<string, string> = {};
  for (const f of t.fields) nextFree[f.id] = f.startTime || t.startTime;

  // verzamel wedstrijden per fase-index zodat KO na poules komt
  const queue: { match: Match; phase: number; round: number }[] = [];
  for (const d of t.divisions) {
    d.stages.forEach((s, si) => {
      if (s.type === "poules") {
        s.poules.forEach((p) =>
          p.matches.forEach((m) => queue.push({ match: m, phase: si, round: m.round ?? 1 }))
        );
      } else if (s.type === "bracket") {
        s.rounds.forEach((r, ri) =>
          r.matches.forEach((m) => queue.push({ match: m, phase: si, round: ri + 1 }))
        );
      } else {
        s.rounds.forEach((r, ri) =>
          r.forEach((m) => queue.push({ match: m, phase: si, round: ri + 1 }))
        );
      }
    });
  }
  queue.sort((a, b) => a.phase - b.phase || a.round - b.round);

  // teams mogen niet tegelijk op twee velden staan: onthoud wanneer een team weer vrij is
  const teamFree: Record<string, string> = {};
  const teamIdsOf = (m: Match, d: Division): string[] => {
    const ids: string[] = [];
    if (m.a.kind === "team") ids.push(m.a.teamId);
    if (m.b.kind === "team") ids.push(m.b.teamId);
    return ids;
  };
  const divisionOf = (m: Match): Division =>
    t.divisions.find((d) => allMatches(d).some((x) => x.id === m.id))!;

  for (const item of queue) {
    const m = item.match;
    const d = divisionOf(m);
    const tids = teamIdsOf(m, d);

    // kies veld dat het vroegst vrij is
    let best = t.fields[0].id;
    for (const f of t.fields) if (nextFree[f.id] < nextFree[best]) best = f.id;

    let start = nextFree[best];
    for (const tid of tids) {
      if (teamFree[tid] && teamFree[tid] > start) start = teamFree[tid];
    }

    m.fieldId = best;
    m.start = start;
    m.day = 0;
    const end = addMinutes(start, slotLen);
    nextFree[best] = end;
    for (const tid of tids) teamFree[tid] = end;
  }

  // scheidsrechters toewijzen zonder dubbelboekingen: alleen wie op dat
  // moment vrij is; niemand vrij -> leeg laten (handmatig oplossen)
  if (t.referees.length > 0) {
    const refFree: Record<string, string> = {};
    for (const r of t.referees) refFree[r.id] = "00:00";
    const chrono = [...queue].sort((a, b) =>
      (a.match.start ?? "99:99").localeCompare(b.match.start ?? "99:99")
    );
    for (const item of chrono) {
      const m = item.match;
      if (!m.start) continue;
      const candidates = t.referees.filter((r) => refFree[r.id] <= m.start!);
      if (candidates.length === 0) {
        m.refereeId = undefined;
        continue;
      }
      // wie het langst geleden gefloten heeft, is aan de beurt
      candidates.sort((a, b) => refFree[a.id].localeCompare(refFree[b.id]));
      m.refereeId = candidates[0].id;
      refFree[candidates[0].id] = addMinutes(m.start, slotLen);
    }
  }
  return t;
}

/**
 * Uitloop op de dag zelf: schuif alle nog niet gespeelde, geplande
 * wedstrijden een aantal minuten op (negatief = terug).
 */
export function shiftSchedule(t: Tournament, minutes: number): number {
  let count = 0;
  for (const d of t.divisions) {
    for (const m of allMatches(d)) {
      if (!m.start) continue;
      if (m.scoreA !== undefined && m.scoreB !== undefined) continue;
      m.start = addMinutes(m.start, minutes);
      count++;
    }
  }
  return count;
}

/** Alle geplande wedstrijden van het toernooi, gesorteerd op tijd en veld. */
export function scheduledMatches(t: Tournament): { match: Match; division: Division }[] {
  const out: { match: Match; division: Division }[] = [];
  for (const d of t.divisions) for (const m of allMatches(d)) out.push({ match: m, division: d });
  out.sort((a, b) => {
    const ta = a.match.start ?? "99:99";
    const tb = b.match.start ?? "99:99";
    if (ta !== tb) return ta.localeCompare(tb);
    return (a.match.fieldId ?? "").localeCompare(b.match.fieldId ?? "");
  });
  return out;
}
