import { Link, useParams } from "react-router-dom";
import { useApp, useTournament } from "../store";
import type { Match } from "../types";
import { allMatches, slotLabel, winnerOf } from "../logic/resolve";
import { isPlayed } from "../logic/standings";
import { DonateButton } from "../components/monetization";

/**
 * Invoerportaal voor scheidsrechters (/scheids/:id/:refId — alleen eigen
 * wedstrijden) en beheerders met uitslag-rechten (/invoer/:id — alles).
 * Werkt op het apparaat waarop het toernooi staat; voor invoer op andere
 * telefoons is de (nog te bouwen) online synchronisatie nodig.
 */
export default function Portal() {
  const { id, refId } = useParams();
  const t = useTournament(id);
  const update = useApp((s) => s.updateTournament);

  if (!t)
    return (
      <div className="p-10 text-center">
        Toernooi niet gevonden. <Link to="/" className="underline">Naar home</Link>
      </div>
    );

  const referee = refId ? t.referees.find((r) => r.id === refId) : undefined;
  if (refId && !referee)
    return <div className="p-10 text-center">Ongeldige scheidsrechterlink.</div>;

  const rows = t.divisions
    .flatMap((d) => allMatches(d).map((m) => ({ m, d })))
    .filter(({ m }) => !refId || m.refereeId === refId)
    .sort((a, b) => (a.m.start ?? "99:99").localeCompare(b.m.start ?? "99:99"));

  const fieldName = (fid?: string) => t.fields.find((f) => f.id === fid)?.name;

  const setScore = (matchId: string, side: "A" | "B", val: string) =>
    update(t.id, (x) => {
      for (const d of x.divisions) {
        const m = allMatches(d).find((y) => y.id === matchId);
        if (m) {
          const v = val === "" ? undefined : Math.max(0, +val);
          if (side === "A") m.scoreA = v;
          else m.scoreB = v;
        }
      }
    });

  const done = rows.filter(({ m }) => isPlayed(m)).length;

  return (
    <div className="min-h-screen" style={{ ["--accent" as string]: t.presentation.accentColor }}>
      <header className="px-4 py-4 text-white" style={{ background: "var(--accent)" }}>
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">{t.name}</h1>
            <p className="text-xs opacity-80">
              {referee ? `Uitslagen invoeren — ${referee.name}` : "Uitslagen invoeren — beheerder"}
            </p>
          </div>
          <DonateButton small />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        <p className="mb-4 text-sm text-slate-500">
          {done} van {rows.length} uitslagen ingevuld
        </p>
        {rows.length === 0 && (
          <p className="text-center text-slate-500">
            {referee
              ? "Er zijn nog geen wedstrijden aan deze scheidsrechter toegewezen (Schema-pagina)."
              : "Er zijn nog geen wedstrijden."}
          </p>
        )}
        <div className="space-y-2">
          {rows.map(({ m, d }) => (
            <PortalRow
              key={m.id}
              start={m.start}
              field={fieldName(m.fieldId)}
              division={t.divisions.length > 1 ? d.name : undefined}
              a={slotLabel(m.a, d, t.scoring)}
              b={slotLabel(m.b, d, t.scoring)}
              m={m}
              onScore={(side, val) => setScore(m.id, side, val)}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

function PortalRow({
  start,
  field,
  division,
  a,
  b,
  m,
  onScore,
}: {
  start?: string;
  field?: string;
  division?: string;
  a: string;
  b: string;
  m: Match;
  onScore: (side: "A" | "B", val: string) => void;
}) {
  const played = isPlayed(m);
  return (
    <div className={`card p-3 ${played ? "opacity-70" : ""}`}>
      <div className="mb-1 flex gap-3 text-xs text-slate-400">
        {start && <span>🕐 {start}</span>}
        {field && <span>🟩 {field}</span>}
        {division && <span>{division}</span>}
        {m.label && <span>{m.label}</span>}
        {played && winnerOf(m) === null && m.scoreA === m.scoreB && <span>gelijkspel</span>}
      </div>
      <div className="flex items-center gap-2">
        <span className="flex-1 truncate text-right text-sm font-medium">{a}</span>
        <input
          type="number"
          min={0}
          inputMode="numeric"
          className="w-14 rounded border border-slate-300 px-1 py-1.5 text-center text-lg"
          value={m.scoreA ?? ""}
          onChange={(e) => onScore("A", e.target.value)}
        />
        <span className="text-slate-400">–</span>
        <input
          type="number"
          min={0}
          inputMode="numeric"
          className="w-14 rounded border border-slate-300 px-1 py-1.5 text-center text-lg"
          value={m.scoreB ?? ""}
          onChange={(e) => onScore("B", e.target.value)}
        />
        <span className="flex-1 truncate text-sm font-medium">{b}</span>
      </div>
    </div>
  );
}
