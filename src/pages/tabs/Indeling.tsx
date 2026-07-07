import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import type { FormatTemplate, Tournament } from "../../types";
import { useApp } from "../../store";
import { Modal, ModalActions } from "../../components/ui";
import { FORMATS, buildFormat, nextPowerOfTwo, seedKnockoutWithTeams } from "../../logic/formats";
import { buildBracket } from "../../logic/bracket";
import { roundRobin } from "../../logic/roundrobin";
import { slotLabel } from "../../logic/resolve";
import { uid } from "../../logic/id";

export default function Indeling() {
  const t = useOutletContext<Tournament>();
  const update = useApp((s) => s.updateTournament);
  const u = (fn: (t: Tournament) => void) => update(t.id, fn);

  const [divIdx, setDivIdx] = useState(0);
  const div = t.divisions[Math.min(divIdx, t.divisions.length - 1)];
  const [pick, setPick] = useState<FormatTemplate | "poule" | "bracket" | null>(null);

  // parameters
  const [pouleCount, setPouleCount] = useState(4);
  const [teamsPerPoule, setTeamsPerPoule] = useState(4);
  const [koSize, setKoSize] = useState(8);
  const [teamSize, setTeamSize] = useState(4);
  const [roundsCount, setRoundsCount] = useState(5);

  const ensureTeams = (needed: number) => {
    // maak automatisch placeholder-teams aan als er nog te weinig teams zijn
    u((x) => {
      const d = x.divisions.find((d) => d.id === div.id)!;
      let i = d.teams.length;
      while (d.teams.length < needed) {
        d.teams.push({ id: uid(), name: `Team ${++i}`, players: [] });
      }
    });
  };

  const apply = (format: FormatTemplate) => {
    if (format === "individueel") {
      u((x) => {
        const d = x.divisions.find((d) => d.id === div.id)!;
        d.individualMode = true;
        let i = d.players.length;
        while (d.players.length < teamSize * 2) d.players.push({ id: uid(), name: `Speler ${++i}` });
        d.template = format;
        d.stages = buildFormat(d, format, { teamSize, roundsCount });
      });
    } else {
      const needed =
        format === "wk" || format === "championsleague"
          ? pouleCount * teamsPerPoule
          : format === "knockout"
            ? koSize
            : Math.max(div.teams.length, 3);
      ensureTeams(needed);
      u((x) => {
        const d = x.divisions.find((d) => d.id === div.id)!;
        d.template = format;
        d.stages = buildFormat(d, format, { pouleCount, koSize });
        if (format === "knockout") seedKnockoutWithTeams(d.stages[0], d);
      });
    }
    setPick(null);
  };

  const reset = () => {
    if (confirm("Indeling en alle wedstrijden van deze divisie verwijderen?"))
      u((x) => {
        const d = x.divisions.find((d) => d.id === div.id)!;
        d.stages = [];
        d.template = undefined;
      });
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <select
          className="card cursor-pointer px-3 py-2 text-sm font-semibold"
          value={divIdx}
          onChange={(e) => setDivIdx(+e.target.value)}
        >
          {t.divisions.map((d, i) => (
            <option key={d.id} value={i}>{d.name}</option>
          ))}
        </select>
        {div.stages.length > 0 && (
          <button className="btn-ghost text-red-500" onClick={reset}>Indeling verwijderen</button>
        )}
      </div>

      {div.stages.length === 0 ? (
        <>
          <h2 className="mb-6 text-center text-2xl font-bold">Kies een indeling voor deze divisie</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {FORMATS.map((f) => (
              <button
                key={f.key}
                onClick={() => setPick(f.key)}
                className="card cursor-pointer p-5 text-left transition hover:shadow-md"
              >
                <div className="mb-2 text-3xl">{f.icon}</div>
                <div className="font-bold">{f.title}</div>
                <p className="mt-1 text-xs text-slate-500">{f.description}</p>
              </button>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-slate-600">
            Of bouw je toernooi zelf op door losse poules en brackets te combineren.
          </p>
          <div className="mt-3 flex justify-center gap-3">
            <button className="btn-outline" onClick={() => setPick("poule")}>+ Poule</button>
            <button className="btn-outline" onClick={() => setPick("bracket")}>+ Bracket</button>
          </div>
        </>
      ) : (
        <StagesView t={t} divId={div.id} />
      )}

      {pick && pick !== "poule" && pick !== "bracket" && (
        <Modal title={FORMATS.find((f) => f.key === pick)!.title} onClose={() => setPick(null)}>
          <div className="space-y-4">
            {(pick === "wk" || pick === "championsleague") && (
              <>
                <div>
                  <label className="label">Hoeveel poules wil je aanmaken?</label>
                  <input type="number" min={1} max={16} className="input" value={pouleCount} onChange={(e) => setPouleCount(+e.target.value)} />
                </div>
                <div>
                  <label className="label">Hoeveel teams zitten er in elke poule?</label>
                  <input type="number" min={2} max={16} className="input" value={teamsPerPoule} onChange={(e) => setTeamsPerPoule(+e.target.value)} />
                </div>
                <div>
                  <label className="label">Met hoeveel teams wil je de knock-outfase beginnen?</label>
                  <select className="input" value={koSize} onChange={(e) => setKoSize(+e.target.value)}>
                    {[2, 4, 8, 16, 32].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </>
            )}
            {pick === "knockout" && (
              <div>
                <label className="label">Met hoeveel teams wil je de knock-outfase beginnen?</label>
                <select className="input" value={koSize} onChange={(e) => setKoSize(+e.target.value)}>
                  {[2, 4, 8, 16, 32].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            )}
            {(pick === "competitie" || pick === "roundrobin") && (
              <p className="text-sm text-slate-600">
                Alle teams van deze divisie ({div.teams.length}) komen in één poule.
                {pick === "roundrobin" && " Iedereen speelt uit én thuis."}
                {div.teams.length < 3 && " Er worden automatisch placeholder-teams aangemaakt; hernoem ze bij Deelnemers."}
              </p>
            )}
            {pick === "individueel" && (
              <>
                <div>
                  <label className="label">Teamgrootte (bijv. 4 voor 4x4)</label>
                  <input type="number" min={1} max={11} className="input" value={teamSize} onChange={(e) => setTeamSize(+e.target.value)} />
                </div>
                <div>
                  <label className="label">Aantal rondes</label>
                  <input type="number" min={1} max={20} className="input" value={roundsCount} onChange={(e) => setRoundsCount(+e.target.value)} />
                </div>
                <p className="text-xs text-slate-500">
                  Spelers loten elke ronde nieuwe teams. Voeg spelers toe bij Deelnemers (schakel "individuele sport" in).
                </p>
              </>
            )}
            <p className="text-xs text-slate-500">Je kunt de indeling later altijd nog aanpassen.</p>
          </div>
          <ModalActions onCancel={() => setPick(null)} onSubmit={() => apply(pick)} submitLabel="Aanmaken" />
        </Modal>
      )}

      {pick === "poule" && (
        <Modal title="Poule toevoegen" onClose={() => setPick(null)}>
          <div>
            <label className="label">Hoeveel teams zitten er in de poule?</label>
            <input type="number" min={2} max={16} className="input" value={teamsPerPoule} onChange={(e) => setTeamsPerPoule(+e.target.value)} />
          </div>
          <ModalActions
            onCancel={() => setPick(null)}
            onSubmit={() => {
              ensureTeams(teamsPerPoule);
              u((x) => {
                const d = x.divisions.find((d) => d.id === div.id)!;
                const unassigned = d.teams
                  .map((tm) => tm.id)
                  .filter(
                    (id) =>
                      !d.stages.some(
                        (s) => s.type === "poules" && s.poules.some((p) => p.teamIds.includes(id))
                      )
                  )
                  .slice(0, teamsPerPoule);
                let stage = d.stages.find((s) => s.type === "poules");
                if (!stage) {
                  stage = { id: uid(), type: "poules", name: "Groepsfase", poules: [] };
                  d.stages.unshift(stage);
                }
                if (stage.type === "poules") {
                  const letters = "ABCDEFGHIJKLMNOP";
                  stage.poules.push({
                    id: uid(),
                    name: `Poule ${letters[stage.poules.length]}`,
                    teamIds: unassigned,
                    matches: roundRobin(unassigned),
                  });
                }
              });
              setPick(null);
            }}
            submitLabel="Aanmaken"
          />
        </Modal>
      )}

      {pick === "bracket" && (
        <Modal title="Bracket toevoegen" onClose={() => setPick(null)}>
          <div>
            <label className="label">Met hoeveel teams begint de bracket?</label>
            <select className="input" value={koSize} onChange={(e) => setKoSize(+e.target.value)}>
              {[2, 4, 8, 16, 32].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <ModalActions
            onCancel={() => setPick(null)}
            onSubmit={() => {
              u((x) => {
                const d = x.divisions.find((d) => d.id === div.id)!;
                const poules = d.stages.flatMap((s) => (s.type === "poules" ? s.poules : []));
                const stage = buildBracket(koSize, poules);
                if (poules.length === 0) seedKnockoutWithTeams(stage, d);
                d.stages.push(stage);
              });
              setPick(null);
            }}
            submitLabel="Aanmaken"
          />
        </Modal>
      )}
    </div>
  );
}

/** Overzicht van de aangemaakte fases: poules met teams, bracket-boom, individuele rondes. */
function StagesView({ t, divId }: { t: Tournament; divId: string }) {
  const update = useApp((s) => s.updateTournament);
  const div = t.divisions.find((d) => d.id === divId)!;
  const teamName = (id: string) => div.teams.find((tm) => tm.id === id)?.name ?? "?";

  return (
    <div className="space-y-8">
      {div.stages.map((s) => (
        <div key={s.id}>
          <h3 className="mb-3 text-lg font-bold">{s.name}</h3>
          {s.type === "poules" && (
            <div className="grid gap-4 md:grid-cols-2">
              {s.poules.map((p) => (
                <div key={p.id} className="card p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-semibold">{p.name}</span>
                    <span className="text-xs text-slate-400">{p.matches.length} wedstrijden</span>
                  </div>
                  <ol className="space-y-1 text-sm">
                    {p.teamIds.map((id, i) => (
                      <li key={id} className="flex items-center gap-2">
                        <span className="w-5 text-xs text-slate-400">{i + 1}.</span>
                        {teamName(id)}
                        <TeamMover t={t} divId={divId} stageId={s.id} pouleId={p.id} teamId={id} />
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          )}
          {s.type === "bracket" && (
            <div className="flex gap-6 overflow-x-auto pb-2">
              {s.rounds.map((r, ri) => (
                <div key={ri} className="min-w-44">
                  <div className="mb-2 text-xs font-semibold uppercase text-slate-500">{r.name}</div>
                  <div className="space-y-3">
                    {r.matches.map((m) => (
                      <div key={m.id} className="card p-2 text-sm">
                        <div className="flex justify-between gap-2">
                          <span className="truncate">{slotLabel(m.a, div, t.scoring)}</span>
                          <span className="text-slate-400">{m.scoreA ?? ""}</span>
                        </div>
                        <div className="flex justify-between gap-2 border-t border-slate-100 pt-1">
                          <span className="truncate">{slotLabel(m.b, div, t.scoring)}</span>
                          <span className="text-slate-400">{m.scoreB ?? ""}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          {s.type === "individual" && (
            <div className="space-y-3">
              {s.rounds.map((round, ri) => (
                <div key={ri} className="card p-3 text-sm">
                  <div className="mb-1 font-semibold">Ronde {ri + 1}</div>
                  {round.map((m) => {
                    const lu = s.lineups[m.id];
                    const names = (ids: string[]) =>
                      ids.map((id) => div.players.find((p) => p.id === id)?.name ?? "?").join(", ");
                    return (
                      <div key={m.id} className="border-t border-slate-100 py-1 text-xs text-slate-600">
                        <b>{names(lu?.a ?? [])}</b> tegen <b>{names(lu?.b ?? [])}</b>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/** Verplaats een team naar een andere poule (en herbereken de wedstrijden). */
function TeamMover({
  t,
  divId,
  stageId,
  pouleId,
  teamId,
}: {
  t: Tournament;
  divId: string;
  stageId: string;
  pouleId: string;
  teamId: string;
}) {
  const update = useApp((s) => s.updateTournament);
  const div = t.divisions.find((d) => d.id === divId)!;
  const stage = div.stages.find((s) => s.id === stageId);
  if (!stage || stage.type !== "poules" || stage.poules.length < 2) return null;

  return (
    <select
      className="ml-auto cursor-pointer text-xs text-slate-400"
      value={pouleId}
      onChange={(e) =>
        update(t.id, (x) => {
          const d = x.divisions.find((d) => d.id === divId)!;
          const st = d.stages.find((s) => s.id === stageId);
          if (!st || st.type !== "poules") return;
          const from = st.poules.find((p) => p.id === pouleId)!;
          const to = st.poules.find((p) => p.id === e.target.value)!;
          from.teamIds = from.teamIds.filter((id) => id !== teamId);
          to.teamIds.push(teamId);
          from.matches = roundRobin(from.teamIds, from.doubleRoundRobin);
          to.matches = roundRobin(to.teamIds, to.doubleRoundRobin);
        })
      }
    >
      {stage.poules.map((p) => (
        <option key={p.id} value={p.id}>{p.name}</option>
      ))}
    </select>
  );
}
