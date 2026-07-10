import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Tournament } from "../types";
import { scheduledMatches } from "../logic/schedule";
import { isPlayed } from "../logic/standings";
import { slotLabel } from "../logic/resolve";

const minutesBetween = (from: string, to: string) => {
  const [fh, fm] = from.split(":").map(Number);
  const [th, tm] = to.split(":").map(Number);
  return th * 60 + tm - (fh * 60 + fm);
};

/**
 * Toernooidag-cockpit: het ene blik-op-de-dag-blok voor de organisator —
 * klok, voortgang, per veld wat er nu speelt en hoeveel het uitloopt, en de
 * aanwezig/betaald-totalen over alle divisies heen. Verschijnt alleen op een
 * toernooidag met een gepland schema; daarbuiten is hij ruis.
 */
export function Cockpit({ t }: { t: Tournament }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(iv);
  }, []);

  const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const hhmm = now.toTimeString().slice(0, 5);
  const rows = scheduledMatches(t).filter((r) => r.match.start);
  if (!t.days.includes(localDate) || rows.length === 0) return null;

  const played = rows.filter((r) => isPlayed(r.match)).length;
  const teams = t.divisions.flatMap((d) => d.teams).filter((tm) => !tm.withdrawn);
  const fields = t.teamFields ?? { present: true, paid: true, email: true };

  const perField = t.fields.map((f) => {
    const fRows = rows.filter((r) => r.match.fieldId === f.id);
    const current =
      fRows.find((r) => r.match.inProgress) ??
      fRows.find((r) => !isPlayed(r.match) && r.match.start! <= hhmm);
    const next = fRows.find((r) => !isPlayed(r.match) && r !== current);
    const firstOpen = fRows.find((r) => !isPlayed(r.match));
    const behind =
      firstOpen && !firstOpen.match.inProgress && firstOpen.match.start! < hhmm
        ? minutesBetween(firstOpen.match.start!, hhmm)
        : 0;
    return { field: f, current, next, behind, done: fRows.every((r) => isPlayed(r.match)) && fRows.length > 0 };
  });

  const label = (r: (typeof rows)[number]) =>
    `${slotLabel(r.match.a, r.division, t.scoring)} — ${slotLabel(r.match.b, r.division, t.scoring)}`;

  return (
    <div className="card mb-6 overflow-hidden">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 text-white" style={{ background: "var(--accent)" }}>
        <span className="text-sm font-bold uppercase tracking-wide" style={{ color: "var(--accent-text)" }}>
          🎛️ Vandaag
        </span>
        <span className="score text-sm font-semibold" style={{ color: "var(--accent-text)" }}>{hhmm}</span>
        <span className="text-sm" style={{ color: "var(--accent-text)" }}>
          {played}/{rows.length} uitslagen binnen
        </span>
        {(fields.present || fields.paid) && teams.length > 0 && (
          <span className="text-sm" style={{ color: "var(--accent-text)" }}>
            {fields.present && `${teams.filter((tm) => tm.present).length}/${teams.length} aanwezig`}
            {fields.present && fields.paid && " · "}
            {fields.paid && `${teams.filter((tm) => tm.paid).length}/${teams.length} betaald`}
          </span>
        )}
        <span className="ml-auto flex gap-3 text-xs">
          <Link to={`/t/${t.id}/schema`} className="underline" style={{ color: "var(--accent-text)" }}>Schema</Link>
          <Link to={`/t/${t.id}/resultaten`} className="underline" style={{ color: "var(--accent-text)" }}>Uitslagen</Link>
          <Link to={`/live/${t.id}`} className="underline" style={{ color: "var(--accent-text)" }}>Presentatie</Link>
        </span>
      </div>
      <div className="divide-y divide-slate-100">
        {perField.map(({ field, current, next, behind, done }) => (
          <div key={field.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 text-sm">
            <span className="w-20 shrink-0 font-semibold">{field.name}</span>
            {behind > 0 && (
              <Link
                to={`/t/${t.id}/schema`}
                className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800"
                title="Loopt achter op het schema — schuif dit veld op via de uitloop-knoppen"
              >
                ⏱ +{behind} min
              </Link>
            )}
            {done ? (
              <span className="text-slate-400">klaar ✓</span>
            ) : current ? (
              <span className="min-w-0 truncate">
                {current.match.inProgress ? (
                  <span className="mr-1.5 font-bold text-red-500">● live</span>
                ) : (
                  <span className="mr-1.5 text-slate-400">nu:</span>
                )}
                {label(current)}
                {current.match.inProgress && (
                  <span className="score ml-1.5 font-bold">
                    {current.match.scoreA ?? 0}–{current.match.scoreB ?? 0}
                  </span>
                )}
              </span>
            ) : (
              <span className="text-slate-400">nog niet begonnen</span>
            )}
            {next && (
              <span className="min-w-0 truncate text-xs text-slate-400">
                straks {next.match.start}: {label(next)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
