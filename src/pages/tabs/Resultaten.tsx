import { Link, useOutletContext } from "react-router-dom";
import type { Match, Tournament } from "../../types";
import { useApp } from "../../store";
import { EmptyState, useDivIdx } from "../../components/ui";
import { pouleStandings } from "../../logic/standings";
import { individualStandings } from "../../logic/individual";
import { allMatches, slotLabel, winnerOf } from "../../logic/resolve";
import { pushScore } from "../../logic/cloud";
import { bracketReadiness, stageProgress, startBracketStage } from "../../logic/phases";
import { TeamBadge } from "../../components/TeamBadge";

export default function Resultaten() {
  const t = useOutletContext<Tournament>();
  const update = useApp((s) => s.updateTournament);
  const [divIdx, setDivIdx] = useDivIdx(t.id, t.divisions.length);
  const div = t.divisions[Math.min(divIdx, t.divisions.length - 1)];

  const setScore = (matchId: string, side: "A" | "B" | "pA" | "pB", val: string) => {
    update(t.id, (x) => {
      for (const d of x.divisions) {
        const m = allMatches(d).find((y) => y.id === matchId);
        if (!m) continue;
        const v = val === "" ? undefined : Math.max(0, +val);
        if (side === "A") m.scoreA = v;
        else if (side === "B") m.scoreB = v;
        else if (side === "pA") m.pensA = v;
        else m.pensB = v;
      }
    });
    pushScore(t.id, matchId);
  };

  if (div.stages.length === 0)
    return (
      <EmptyState icon="🔢" title="Nog geen indeling" subtitle="Maak eerst een indeling om uitslagen in te vullen." />
    );

  const teamName = (id: string) => div.teams.find((tm) => tm.id === id)?.name ?? "?";

  /** Voortgangschip per fase: "11/16 uitslagen" met balkje, groen als compleet. */
  const ProgressChip = ({ done, total }: { done: number; total: number }) => {
    if (total === 0) return null;
    const complete = done === total;
    return (
      <span
        className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
          complete ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
        }`}
      >
        <span className="score">
          {done}/{total} uitslagen {complete && "✓"}
        </span>
        <span className="h-1.5 w-16 overflow-hidden rounded-full bg-black/10">
          <span
            className="block h-full rounded-full transition-all"
            style={{ width: `${(done / total) * 100}%`, background: complete ? "#16a34a" : "var(--accent)" }}
          />
        </span>
      </span>
    );
  };

  const MatchRow = ({ m, ko, disabled }: { m: Match; ko?: boolean; disabled?: boolean }) => {
    const drawInKo =
      ko && m.scoreA !== undefined && m.scoreB !== undefined && m.scoreA === m.scoreB;
    return (
      <div className="flex items-center gap-2 border-t border-slate-100 py-1.5 text-sm">
        <span className="w-12 text-xs text-slate-400">{m.start ?? ""}</span>
        <span className="flex-1 truncate text-right">{slotLabel(m.a, div, t.scoring)}</span>
        <input
          type="number"
          min={0}
          disabled={disabled}
          className="w-12 rounded border border-slate-200 px-1 py-0.5 text-center disabled:bg-slate-50"
          value={m.scoreA ?? ""}
          onChange={(e) => setScore(m.id, "A", e.target.value)}
        />
        <span className="text-slate-400">–</span>
        <input
          type="number"
          min={0}
          disabled={disabled}
          className="w-12 rounded border border-slate-200 px-1 py-0.5 text-center disabled:bg-slate-50"
          value={m.scoreB ?? ""}
          onChange={(e) => setScore(m.id, "B", e.target.value)}
        />
        <span className="flex-1 truncate">{slotLabel(m.b, div, t.scoring)}</span>
        {drawInKo && t.scoring.shootouts && (
          <span className="flex items-center gap-1 text-xs text-slate-500">
            pen.
            <input
              type="number"
              min={0}
              className="w-10 rounded border border-slate-200 px-1 py-0.5 text-center"
              value={m.pensA ?? ""}
              onChange={(e) => setScore(m.id, "pA", e.target.value)}
            />
            –
            <input
              type="number"
              min={0}
              className="w-10 rounded border border-slate-200 px-1 py-0.5 text-center"
              value={m.pensB ?? ""}
              onChange={(e) => setScore(m.id, "pB", e.target.value)}
            />
          </span>
        )}
        {drawInKo && !t.scoring.shootouts && (
          <span className="text-xs text-amber-600">gelijk — winnaar onbekend</span>
        )}
        {ko && winnerOf(m) && <span className="text-xs text-green-600">✓</span>}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <select
          className="card cursor-pointer px-3 py-2 text-sm font-semibold"
          value={divIdx}
          onChange={(e) => setDivIdx(+e.target.value)}
        >
          {t.divisions.map((d, i) => (
            <option key={d.id} value={i}>{d.name}</option>
          ))}
        </select>
        <Link
          to={`/invoer/${t.id}`}
          className="btn-outline"
          title="Alle wedstrijden chronologisch invoeren — handig als de uitslagbriefjes op tijdsvolgorde binnenkomen"
        >
          🧾 Wedstrijdtafel-modus (op tijd)
        </Link>
      </div>

      {div.stages.map((s) => {
        const prog = stageProgress(s);
        const readiness = s.type === "bracket" ? bracketReadiness(div, s) : null;
        const gated = s.type === "bracket" && !s.started && readiness!.hasSources;
        return (
        <div key={s.id} className="mb-8">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-bold">{s.name}</h3>
            <ProgressChip done={prog.done} total={prog.total} />
            {s.type === "bracket" && s.started && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">gestart</span>
            )}
          </div>

          {gated &&
            (readiness!.ready ? (
              <div className="stadium fade-in mb-4 flex flex-wrap items-center justify-between gap-4 rounded-xl p-5 text-white">
                <div>
                  <div className="font-bold">Groepsfase compleet ✓</div>
                  <p className="mt-1 text-sm text-white/80">
                    Alle uitslagen zijn binnen. Start de volgende fase om de teams door te schuiven
                    op basis van de eindstand.
                  </p>
                </div>
                <button
                  className="shrink-0 cursor-pointer rounded-full bg-amber-400 px-6 py-3 font-black text-amber-950 shadow-lg transition hover:-translate-y-0.5 hover:bg-amber-300"
                  onClick={() => {
                    if (!confirm(`${s.name} starten? De eindstand van de poules bepaalt de indeling — dit kan niet ongedaan worden gemaakt.`))
                      return;
                    update(t.id, (x) => {
                      const dd = x.divisions.find((d) => d.id === div.id)!;
                      startBracketStage(dd, s.id, x.scoring);
                    });
                  }}
                >
                  🏁 Start {s.name.toLowerCase()}
                </button>
              </div>
            ) : (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                ⏳ Deze fase start zodra de groepsfase compleet is — nog{" "}
                <b>{readiness!.missing}</b> uitslag{readiness!.missing !== 1 ? "en" : ""} nodig.
                Daarna verschijnt hier de startknop.
              </div>
            ))}

          {s.type === "poules" &&
            s.poules.map((p) => {
              const rows = pouleStandings(p, t.scoring);
              return (
                <div key={p.id} className="mb-6 grid gap-4 lg:grid-cols-2">
                  <div className="card p-4">
                    <div className="mb-1 font-semibold">{p.name} — wedstrijden</div>
                    {p.matches.map((m) => <MatchRow key={m.id} m={m} />)}
                  </div>
                  <div className="card p-4">
                    <div className="mb-2 font-semibold">{p.name} — stand</div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs uppercase text-slate-400">
                          <th className="py-1">#</th>
                          <th>Team</th>
                          <th className="text-center">G</th>
                          <th className="text-center">W</th>
                          <th className="text-center">GL</th>
                          <th className="text-center">V</th>
                          <th className="text-center">DS</th>
                          <th className="text-center">P</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, i) => (
                          <tr key={r.teamId} className="border-t border-slate-100">
                            <td className="py-1 text-slate-400">{i + 1}</td>
                            <td className="font-medium">
                              <span className="flex items-center gap-1.5">
                                <TeamBadge team={div.teams.find((tm) => tm.id === r.teamId)} size={18} />
                                {teamName(r.teamId)}
                              </span>
                            </td>
                            <td className="text-center">{r.played}</td>
                            <td className="text-center">{r.won}</td>
                            <td className="text-center">{r.drawn}</td>
                            <td className="text-center">{r.lost}</td>
                            <td className="text-center">{r.goalDiff > 0 ? `+${r.goalDiff}` : r.goalDiff}</td>
                            <td className="text-center font-bold">{r.points}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}

          {s.type === "bracket" &&
            s.rounds.map((r, ri) => (
              <div key={ri} className={`card mb-4 p-4 ${gated ? "opacity-60" : ""}`}>
                <div className="mb-1 font-semibold">{r.name}</div>
                {r.matches.map((m) => <MatchRow key={m.id} m={m} ko disabled={gated} />)}
              </div>
            ))}

          {s.type === "individual" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                {s.rounds.map((round, ri) => (
                  <div key={ri} className="card mb-4 p-4">
                    <div className="mb-1 font-semibold">Ronde {ri + 1}</div>
                    {round.map((m) => {
                      const lu = s.lineups[m.id];
                      const names = (ids: string[]) =>
                        ids.map((id) => div.players.find((pl) => pl.id === id)?.name ?? "?").join(", ");
                      return (
                        <div key={m.id} className="flex items-center gap-2 border-t border-slate-100 py-1.5 text-xs">
                          <span className="flex-1 text-right">{names(lu?.a ?? [])}</span>
                          <input
                            type="number"
                            min={0}
                            className="w-12 rounded border border-slate-200 px-1 py-0.5 text-center text-sm"
                            value={m.scoreA ?? ""}
                            onChange={(e) => setScore(m.id, "A", e.target.value)}
                          />
                          <span className="text-slate-400">–</span>
                          <input
                            type="number"
                            min={0}
                            className="w-12 rounded border border-slate-200 px-1 py-0.5 text-center text-sm"
                            value={m.scoreB ?? ""}
                            onChange={(e) => setScore(m.id, "B", e.target.value)}
                          />
                          <span className="flex-1">{names(lu?.b ?? [])}</span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className="card h-fit p-4">
                <div className="mb-2 font-semibold">Individueel klassement</div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase text-slate-400">
                      <th className="py-1">#</th>
                      <th>Speler</th>
                      <th className="text-center">G</th>
                      <th className="text-center">W</th>
                      <th className="text-center">P</th>
                    </tr>
                  </thead>
                  <tbody>
                    {individualStandings(s, div.players, t.scoring.win, t.scoring.draw, t.scoring.loss).map(
                      (r, i) => (
                        <tr key={r.playerId} className="border-t border-slate-100">
                          <td className="py-1 text-slate-400">{i + 1}</td>
                          <td className="font-medium">
                            {div.players.find((p) => p.id === r.playerId)?.name ?? "?"}
                          </td>
                          <td className="text-center">{r.played}</td>
                          <td className="text-center">{r.won}</td>
                          <td className="text-center font-bold">{r.points}</td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        );
      })}
    </div>
  );
}
