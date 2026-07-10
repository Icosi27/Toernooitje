import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Tournament } from "../types";
import { useApp } from "../store";
import { scheduledMatches } from "../logic/schedule";
import { isPlayed } from "../logic/standings";
import { slotLabel } from "../logic/resolve";
import { uid } from "../logic/id";

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
  const update = useApp((s) => s.updateTournament);
  const [now, setNow] = useState(() => new Date());
  const [msg, setMsg] = useState("");
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

      {/* omroep: bereikt iedereen op de kijklink en de scheidsen — hopen dat
          mensen toevallig verversen is geen communicatiestrategie */}
      <div className="border-t border-slate-100 px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="input min-w-48 flex-1"
            placeholder="📢 Mededeling voor iedereen (bijv. 'alles schuift 15 min op')"
            value={msg}
            maxLength={140}
            onChange={(e) => setMsg(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && msg.trim() && announce()}
          />
          <button className="btn-primary shrink-0" disabled={!msg.trim()} onClick={announce}>
            Omroepen
          </button>
        </div>
        {(t.announcements ?? []).length > 0 && (
          <div className="mt-2 space-y-1">
            {[...(t.announcements ?? [])].reverse().map((a) => (
              <div key={a.id} className="flex items-center gap-2 text-sm text-slate-600">
                <span className="score text-xs text-slate-400">{a.createdAt.slice(11, 16)}</span>
                <span className="min-w-0 flex-1 truncate">📢 {a.text}</span>
                <button
                  className="cursor-pointer px-1 text-slate-300 hover:text-red-500"
                  title="Mededeling intrekken (verdwijnt overal)"
                  onClick={() =>
                    update(t.id, (x) => {
                      x.announcements = (x.announcements ?? []).filter((y) => y.id !== a.id);
                    })
                  }
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  function announce() {
    const text = msg.trim();
    if (!text) return;
    // lokale datum+tijd, zodat "vandaag"-filter en tijdweergave kloppen
    const stamp = `${localDate}T${hhmm}`;
    update(t.id, (x) => {
      (x.announcements ??= []).push({ id: uid(), text, createdAt: stamp });
    });
    setMsg("");
  }
}
