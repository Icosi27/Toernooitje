import { useRef, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import type { Match, Stage, Tournament } from "../../types";
import { useApp } from "../../store";
import { EmptyState, useDivIdx } from "../../components/ui";
import { pouleStandings } from "../../logic/standings";
import { individualStandings } from "../../logic/individual";
import { allMatches, slotLabel, winnerOf } from "../../logic/resolve";
import { pushScore } from "../../logic/cloud";
import {
  bracketReadiness,
  pouleRankOptions,
  seedingIssues,
  stageProgress,
  startBracketStage,
} from "../../logic/phases";
import { seedSlots } from "../../logic/bracket";
import { TeamBadge } from "../../components/TeamBadge";
import { PodiumCard } from "../../components/Podium";
import { printOverview } from "../../logic/print";

export default function Resultaten() {
  const t = useOutletContext<Tournament>();
  const update = useApp((s) => s.updateTournament);
  const [divIdx, setDivIdx] = useDivIdx(t.id, t.divisions.length);
  const div = t.divisions[Math.min(divIdx, t.divisions.length - 1)];

  // undo voor "Start knock-outfase": snapshot van de fases vlak vóór de start,
  // 8 seconden terug te draaien — een verkeerd ingevoerde poule-uitslag die je
  // nét te laat ziet is anders onherstelbaar op het drukste moment van de dag
  const [undoSnap, setUndoSnap] = useState<{ divId: string; stages: string; name: string } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const armUndo = (divId: string, stages: Stage[], name: string) => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndoSnap({ divId, stages: JSON.stringify(stages), name });
    undoTimer.current = setTimeout(() => setUndoSnap(null), 8000);
  };
  const undoStart = () => {
    if (!undoSnap) return;
    update(t.id, (x) => {
      const dd = x.divisions.find((d) => d.id === undoSnap.divId);
      if (dd) dd.stages = JSON.parse(undoSnap.stages) as Stage[];
    });
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndoSnap(null);
  };

  /** Concept wordt pas doorgevoerd bij Opslaan — uitslagen blijven altijd te corrigeren. */
  const saveScore = (
    matchId: string,
    v: { a?: number; b?: number; pa?: number; pb?: number }
  ) => {
    update(t.id, (x) => {
      for (const d of x.divisions) {
        const m = allMatches(d).find((y) => y.id === matchId);
        if (!m) continue;
        m.scoreA = v.a;
        m.scoreB = v.b;
        m.pensA = v.pa;
        m.pensB = v.pb;
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

  /** Kiesbare poule-plaatsing op een KO-slot, zolang de fase niet gestart is. */
  const SlotSelect = ({ m, side, alignRight }: { m: Match; side: "a" | "b"; alignRight?: boolean }) => {
    const slot = m[side];
    const value = slot.kind === "pouleRank" ? `${slot.pouleId}:${slot.rank}` : "tbd";
    return (
      <select
        className={`max-w-full cursor-pointer rounded border border-slate-200 bg-white px-1 py-0.5 ${alignRight ? "text-right" : ""}`}
        value={value}
        title="Kies welke poule-plaatsing hier speelt"
        onChange={(e) => {
          const v = e.target.value;
          update(t.id, (x) => {
            const dd = x.divisions.find((d) => d.id === div.id);
            const mm = dd && allMatches(dd).find((y) => y.id === m.id);
            if (!mm) return;
            if (v === "tbd") mm[side] = { kind: "tbd" };
            else {
              const [pouleId, rank] = v.split(":");
              mm[side] = { kind: "pouleRank", pouleId, rank: +rank };
            }
          });
        }}
      >
        <option value="tbd">N.t.b.</option>
        {pouleRankOptions(div).map((o) => (
          <option key={`${o.pouleId}:${o.rank}`} value={`${o.pouleId}:${o.rank}`}>
            Nr. {o.rank} {o.pouleName}
          </option>
        ))}
      </select>
    );
  };

  const MatchRow = ({
    m,
    ko,
    disabled,
    editableSlots,
  }: {
    m: Match;
    ko?: boolean;
    disabled?: boolean;
    editableSlots?: boolean;
  }) => {
    // concept-invoer: pas doorgevoerd (en gepubliceerd) na een druk op Opslaan
    const [draft, setDraft] = useState<{ a: string; b: string; pa: string; pb: string } | null>(null);
    const asStr = (v?: number) => (v !== undefined ? String(v) : "");
    const current = { a: asStr(m.scoreA), b: asStr(m.scoreB), pa: asStr(m.pensA), pb: asStr(m.pensB) };
    const shown = draft ?? current;
    const dirty =
      draft !== null &&
      (draft.a !== current.a || draft.b !== current.b || draft.pa !== current.pa || draft.pb !== current.pb);
    const edit = (key: "a" | "b" | "pa" | "pb", val: string) => setDraft({ ...shown, [key]: val });
    const commit = () => {
      if (!draft) return;
      const parse = (v: string) => (v === "" ? undefined : Math.max(0, +v));
      saveScore(m.id, { a: parse(draft.a), b: parse(draft.b), pa: parse(draft.pa), pb: parse(draft.pb) });
      setDraft(null);
    };
    const shownA = shown.a === "" ? undefined : +shown.a;
    const shownB = shown.b === "" ? undefined : +shown.b;
    const drawInKo = ko && shownA !== undefined && shownB !== undefined && shownA === shownB;
    const canEdit = (slot: Match["a"]) => editableSlots && (slot.kind === "pouleRank" || slot.kind === "tbd");
    const inputCls = "w-12 rounded border px-1 py-0.5 text-center disabled:bg-slate-50 " +
      (dirty ? "border-amber-400 bg-amber-50" : "border-slate-200");
    return (
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 py-1.5 text-sm">
        <span className="w-12 text-xs text-slate-400">{m.start ?? ""}</span>
        {t.fields.length > 0 && (
          <span className="w-14 truncate text-xs text-slate-400" title="Veld">
            {t.fields.find((f) => f.id === m.fieldId)?.name ?? ""}
          </span>
        )}
        {canEdit(m.a) ? (
          <span className="flex flex-1 justify-end">
            <SlotSelect m={m} side="a" alignRight />
          </span>
        ) : (
          <span className="flex-1 truncate text-right">{slotLabel(m.a, div, t.scoring)}</span>
        )}
        <input
          type="number"
          min={0}
          disabled={disabled}
          className={inputCls}
          value={shown.a}
          onChange={(e) => edit("a", e.target.value)}
        />
        <span className="text-slate-400">–</span>
        <input
          type="number"
          min={0}
          disabled={disabled}
          className={inputCls}
          value={shown.b}
          onChange={(e) => edit("b", e.target.value)}
        />
        {canEdit(m.b) ? (
          <span className="flex flex-1">
            <SlotSelect m={m} side="b" />
          </span>
        ) : (
          <span className="flex-1 truncate">{slotLabel(m.b, div, t.scoring)}</span>
        )}
        {drawInKo && t.scoring.shootouts && (
          <span className="flex items-center gap-1 text-xs text-slate-500">
            pen.
            <input
              type="number"
              min={0}
              className={inputCls + " w-10"}
              value={shown.pa}
              onChange={(e) => edit("pa", e.target.value)}
            />
            –
            <input
              type="number"
              min={0}
              className={inputCls + " w-10"}
              value={shown.pb}
              onChange={(e) => edit("pb", e.target.value)}
            />
          </span>
        )}
        {drawInKo && !t.scoring.shootouts && (
          <span className="text-xs text-amber-600">gelijk — winnaar onbekend</span>
        )}
        {!dirty && ko && winnerOf(m) && <span className="text-xs text-green-600">✓</span>}
        {dirty && (
          <span className="flex items-center gap-1">
            <button className="btn-ghost px-2 py-0.5 text-xs" onClick={() => setDraft(null)}>
              Annuleer
            </button>
            <button className="btn-primary px-3 py-1 text-xs" onClick={commit}>
              💾 Opslaan
            </button>
          </span>
        )}
      </div>
    );
  };

  /** Score-invoer voor individuele wedstrijden, met hetzelfde concept + Opslaan-patroon. */
  const IndivRow = ({ m, aName, bName }: { m: Match; aName: string; bName: string }) => {
    const [draft, setDraft] = useState<{ a: string; b: string } | null>(null);
    const asStr = (v?: number) => (v !== undefined ? String(v) : "");
    const shown = draft ?? { a: asStr(m.scoreA), b: asStr(m.scoreB) };
    const dirty = draft !== null && (draft.a !== asStr(m.scoreA) || draft.b !== asStr(m.scoreB));
    const inputCls =
      "w-12 rounded border px-1 py-0.5 text-center text-sm " +
      (dirty ? "border-amber-400 bg-amber-50" : "border-slate-200");
    return (
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 py-1.5 text-xs">
        <span className="flex-1 text-right">{aName}</span>
        <input
          type="number"
          min={0}
          className={inputCls}
          value={shown.a}
          onChange={(e) => setDraft({ ...shown, a: e.target.value })}
        />
        <span className="text-slate-400">–</span>
        <input
          type="number"
          min={0}
          className={inputCls}
          value={shown.b}
          onChange={(e) => setDraft({ ...shown, b: e.target.value })}
        />
        <span className="flex-1">{bName}</span>
        {dirty && (
          <span className="flex items-center gap-1">
            <button className="btn-ghost px-2 py-0.5 text-xs" onClick={() => setDraft(null)}>
              Annuleer
            </button>
            <button
              className="btn-primary px-3 py-1 text-xs"
              onClick={() => {
                const parse = (v: string) => (v === "" ? undefined : Math.max(0, +v));
                saveScore(m.id, { a: parse(shown.a), b: parse(shown.b) });
                setDraft(null);
              }}
            >
              💾 Opslaan
            </button>
          </span>
        )}
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
        <button
          className="btn-outline"
          title="Print de actuele standen (en het schema) voor het prikbord"
          onClick={() => printOverview(t)}
        >
          🖨️ Print
        </button>
      </div>

      <div className="mb-6 empty:hidden">
        <PodiumCard t={t} d={div} />
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
                    if (!confirm(`${s.name} starten? De eindstand van de poules bepaalt de indeling. Je kunt het direct daarna nog even ongedaan maken.`))
                      return;
                    armUndo(div.id, div.stages, s.name);
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

          {gated && (
            <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-slate-600">
              <span>
                ✏️ De koppelingen hieronder zijn aan te passen totdat de fase start — kies per
                wedstrijd zelf wie tegen wie speelt.
              </span>
              <button
                className="btn-outline px-3 py-1 text-xs"
                title="Zet de eerste ronde terug naar de standaard kruislingse indeling"
                onClick={() =>
                  update(t.id, (x) => {
                    const dd = x.divisions.find((d) => d.id === div.id);
                    const st = dd?.stages.find((y) => y.id === s.id);
                    if (!dd || !st || st.type !== "bracket") return;
                    const poules = dd.stages
                      .filter((y): y is Extract<typeof y, { type: "poules" }> => y.type === "poules")
                      .flatMap((y) => y.poules);
                    const slots = seedSlots(st.size, poules);
                    st.rounds[0]?.matches.forEach((mm, i) => {
                      mm.a = slots[i * 2];
                      mm.b = slots[i * 2 + 1];
                    });
                  })
                }
              >
                ↺ Herstel standaardindeling
              </button>
            </div>
          )}
          {gated && s.type === "bracket" && seedingIssues(div, s).length > 0 && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              ⚠️ Controleer de indeling: {seedingIssues(div, s).join(" · ")}. Starten kan gewoon,
              maar dubbele plaatsingen zetten hetzelfde team twee keer in de bracket.
            </div>
          )}

          {s.type === "bracket" &&
            s.rounds.map((r, ri) => (
              <div key={ri} className={`card mb-4 p-4 ${gated && ri > 0 ? "opacity-60" : ""}`}>
                <div className="mb-1 font-semibold">{r.name}</div>
                {r.matches.map((m) => (
                  <MatchRow key={m.id} m={m} ko disabled={gated} editableSlots={gated && ri === 0} />
                ))}
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
                      return <IndivRow key={m.id} m={m} aName={names(lu?.a ?? [])} bName={names(lu?.b ?? [])} />;
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

      {undoSnap && (
        <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full bg-slate-900 px-5 py-2.5 text-sm text-white shadow-xl">
          <span>🏁 {undoSnap.name} gestart</span>
          <button className="cursor-pointer font-bold underline" onClick={undoStart}>
            Ongedaan maken
          </button>
        </div>
      )}
    </div>
  );
}
