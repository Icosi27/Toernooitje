import { useState } from "react";
import type { Tournament } from "../types";

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Mededelingen van vandaag, nieuwste eerst — oude dagen zijn ruis. */
export function todaysAnnouncements(t: Tournament) {
  const today = localToday();
  return (t.announcements ?? [])
    .filter((a) => a.createdAt.slice(0, 10) === today)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Omgeroepen mededelingen op de publieke pagina's en het scheidsportaal.
 * Per apparaat wegklikbaar (blijft weg via localStorage); in presentatiemodus
 * (`big`) juist groot en niet wegklikbaar — het kantinescherm ís de omroep.
 */
export function Announcements({ t, big = false }: { t: Tournament; big?: boolean }) {
  const seenKey = `toernooitje-omroep-gezien-${t.id}`;
  const [seen, setSeen] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(seenKey) ?? "[]") as string[];
    } catch {
      return [];
    }
  });
  const items = todaysAnnouncements(t);

  if (big) {
    const latest = items[0];
    if (!latest) return null;
    return (
      <div className="mb-4 flex items-center gap-4 rounded-xl border-2 border-amber-400 bg-amber-400/15 px-5 py-3 text-xl font-bold text-amber-100">
        <span className="text-3xl">📢</span>
        <span className="min-w-0 flex-1">{latest.text}</span>
        <span className="score shrink-0 text-sm font-normal text-amber-200/80">
          {latest.createdAt.slice(11, 16)}
        </span>
      </div>
    );
  }

  const shown = items.filter((a) => !seen.includes(a.id));
  if (shown.length === 0) return null;
  const dismiss = (id: string) => {
    const next = [...seen, id];
    setSeen(next);
    try {
      localStorage.setItem(seenKey, JSON.stringify(next));
    } catch {
      // opslag vol: melding komt na een refresh terug — geen ramp
    }
  };

  return (
    <div className="space-y-2">
      {shown.map((a) => (
        <div
          key={a.id}
          className="fade-in flex items-start gap-2 rounded-lg border-2 px-3 py-2 text-sm font-medium"
          style={{ borderColor: "var(--accent)", background: "var(--accent-soft)" }}
        >
          <span>📢</span>
          <span className="min-w-0 flex-1">
            {a.text}
            <span className="score ml-2 text-xs font-normal text-slate-400">
              {a.createdAt.slice(11, 16)}
            </span>
          </span>
          <button
            className="cursor-pointer px-1 font-bold text-slate-300 hover:text-slate-600"
            title="Gelezen — verberg deze mededeling"
            onClick={() => dismiss(a.id)}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
