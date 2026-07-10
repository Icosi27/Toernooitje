import { useEffect, useRef, useState } from "react";
import type { Division, Match, Tournament } from "../types";
import { allMatches, slotLabel } from "../logic/resolve";

export interface ScheduleNotice {
  id: string; // match-id
  text: string;
}

/**
 * Detecteert stille schemawijzigingen tussen twee versies van de (live
 * bijgewerkte) toernooidata: een verplaatste starttijd of een ander veld van
 * een wedstrijd die de kijker aangaat. Stil bijwerken is hoe iemand een
 * wedstrijd mist — dit maakt de wijziging expliciet.
 */
export function useScheduleChanges(
  t: Tournament | undefined,
  relevantKey: string,
  relevant: (m: Match, d: Division) => boolean
): { notices: ScheduleNotice[]; dismiss: (id: string) => void } {
  const [notices, setNotices] = useState<ScheduleNotice[]>([]);
  const prev = useRef<Map<string, { start?: string; fieldId?: string; label: string }> | null>(null);
  const relevantRef = useRef(relevant);
  relevantRef.current = relevant;

  useEffect(() => {
    if (!t) {
      prev.current = null;
      return;
    }
    const snapshot = new Map<string, { start?: string; fieldId?: string; label: string }>();
    for (const d of t.divisions) {
      for (const m of allMatches(d)) {
        if (!relevantRef.current(m, d)) continue;
        snapshot.set(m.id, {
          start: m.start,
          fieldId: m.fieldId,
          label: `${slotLabel(m.a, d, t.scoring)} — ${slotLabel(m.b, d, t.scoring)}`,
        });
      }
    }
    const before = prev.current;
    prev.current = snapshot;
    if (!before) return;

    const fieldName = (id?: string) => t.fields.find((f) => f.id === id)?.name;
    const fresh: ScheduleNotice[] = [];
    for (const [mid, cur] of snapshot) {
      const old = before.get(mid);
      if (!old) continue;
      if (old.start === cur.start && old.fieldId === cur.fieldId) continue;
      const parts: string[] = [];
      if (old.start !== cur.start) parts.push(cur.start ? `naar ${cur.start}` : "uit de planning");
      if (old.fieldId !== cur.fieldId && cur.fieldId && fieldName(cur.fieldId))
        parts.push(`naar ${fieldName(cur.fieldId)}`);
      fresh.push({ id: mid, text: `${cur.label} is verplaatst ${parts.join(" en ")}.` });
    }
    if (fresh.length > 0)
      setNotices((cur) => [...cur.filter((n) => !fresh.some((f) => f.id === n.id)), ...fresh].slice(-3));
  }, [t, relevantKey]);

  return { notices, dismiss: (id) => setNotices((cur) => cur.filter((n) => n.id !== id)) };
}

/** Amber meldingsbalkjes voor verplaatste wedstrijden, per stuk weg te klikken. */
export function ScheduleNotices({
  notices,
  dismiss,
}: {
  notices: ScheduleNotice[];
  dismiss: (id: string) => void;
}) {
  if (notices.length === 0) return null;
  return (
    <div className="space-y-2">
      {notices.map((n) => (
        <div
          key={n.id}
          className="fade-in flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800"
        >
          <span>⚠</span>
          <span className="min-w-0 flex-1">{n.text}</span>
          <button
            className="cursor-pointer px-1 font-bold text-amber-400 hover:text-amber-700"
            title="Melding sluiten"
            onClick={() => dismiss(n.id)}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
