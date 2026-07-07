import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import type { Match, Tournament } from "../../types";
import { useApp } from "../../store";
import { EmptyState } from "../../components/ui";
import { pouleStandings } from "../../logic/standings";
import { individualStandings } from "../../logic/individual";
import { allMatches, slotLabel, winnerOf } from "../../logic/resolve";
import { pushScore } from "../../logic/cloud";
import { TeamBadge } from "../../components/TeamBadge";

export default function Resultaten() {
  const t = useOutletContext<Tournament>();
  const update = useApp((s) => s.updateTournament);
  const [divIdx, setDivIdx] = useState(0);
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

  const MatchRow = ({ m, ko }: { m: Match; ko?: boolean }) => {
    const drawInKo =
      ko && m.scoreA !== undefined && m.scoreB !== undefined && m.scoreA === m.scoreB;
    return (
      <div className="flex items-center gap-2 border-t border-slate-100 py-1.5 text-sm">
        <span className="w-12 text-xs text-slate-400">{m.start ?? ""}</span>
        <span className="flex-1 truncate text-right">{slotLabel(m.a, div, t.scoring)}</span>
        <input
          type="number"
          min={0}
          className="w-12 rounded border border-slate-200 px-1 py-0.5 text-center"
          value={m.scoreA ?? ""}
          onChange={(e) => setScore(m.id, "A", e.target.value)}
        />
        <span className="text-slate-400">–</span>
        <input
          type="number"
          min={0}
          className="w-12 rounded border border-slate-200 px-1 py-0.5 text-center"
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
      <select
        className="card mb-6 cursor-pointer px-3 py-2 text-sm font-semibold"
        value={divIdx}
        onChange={(e) => setDivIdx(+e.target.value)}
      >
        {t.divisions.map((d, i) => (
          <option key={d.id} value={i}>{d.name}</option>
        ))}
      </select>

      {div.stages.map((s) => (
        <div key={s.id} className="mb-8">
          <h3 className="mb-3 text-lg font-bold">{s.name}</h3>

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
              <div key={ri} className="card mb-4 p-4">
                <div className="mb-1 font-semibold">{r.name}</div>
                {r.matches.map((m) => <MatchRow key={m.id} m={m} ko />)}
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
      ))}
    </div>
  );
}
