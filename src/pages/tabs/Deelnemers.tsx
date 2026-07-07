import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import type { Tournament } from "../../types";
import { useApp } from "../../store";
import { EmptyState, Modal, ModalActions, Toggle } from "../../components/ui";
import { uid } from "../../logic/id";

type Tab = "teams" | "scheidsrechters" | "beheerders";

export default function Deelnemers() {
  const t = useOutletContext<Tournament>();
  const update = useApp((s) => s.updateTournament);
  const u = (fn: (t: Tournament) => void) => update(t.id, fn);

  const [tab, setTab] = useState<Tab>("teams");
  const [divIdx, setDivIdx] = useState(0);
  const [modal, setModal] = useState<null | "team" | "referee" | "admin" | "player">(null);
  const [nameInput, setNameInput] = useState("");
  const [bulkMode, setBulkMode] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [playerTeamId, setPlayerTeamId] = useState<string | null>(null);

  const div = t.divisions[Math.min(divIdx, t.divisions.length - 1)];

  const addTeams = () => {
    const names = bulkMode
      ? nameInput.split("\n").map((s) => s.trim()).filter(Boolean)
      : [nameInput.trim()].filter(Boolean);
    u((x) => {
      const d = x.divisions.find((d) => d.id === div.id)!;
      for (const n of names) d.teams.push({ id: uid(), name: n, players: [] });
    });
    setNameInput("");
    setModal(null);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="card mb-6 flex overflow-hidden">
        {(["teams", "scheidsrechters", "beheerders"] as Tab[]).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`flex-1 cursor-pointer border-b-2 py-3 text-sm font-semibold uppercase tracking-wide ${
              tab === k ? "" : "border-transparent text-slate-500"
            }`}
            style={tab === k ? { borderColor: "var(--accent)", color: "var(--accent)" } : undefined}
          >
            {k}
          </button>
        ))}
      </div>

      {tab === "teams" && (
        <>
          <div className="mb-4 flex items-center gap-3">
            <select
              className="card cursor-pointer px-3 py-2 text-sm font-semibold"
              value={divIdx}
              onChange={(e) => setDivIdx(+e.target.value)}
            >
              {t.divisions.map((d, i) => (
                <option key={d.id} value={i}>{d.name}</option>
              ))}
            </select>
            <Toggle
              checked={div.individualMode}
              onChange={(v) =>
                u((x) => (x.divisions.find((d) => d.id === div.id)!.individualMode = v))
              }
              label="Individuele sport (spelers i.p.v. teams)"
            />
          </div>

          {!div.individualMode ? (
            div.teams.length === 0 ? (
              <EmptyState
                icon="👕"
                title="Voeg teams toe aan deze divisie"
                subtitle="Of begin met het maken van een indeling en voeg de teams later toe."
                action={<button className="btn-outline" onClick={() => setModal("team")}>Voeg team toe</button>}
              />
            ) : (
              <>
                <div className="card divide-y divide-slate-100">
                  {div.teams.map((team, i) => (
                    <div key={team.id} className="flex items-center gap-3 px-4 py-2">
                      <span className="w-6 text-xs text-slate-400">{i + 1}</span>
                      <input
                        className="input border-0 font-medium"
                        value={team.name}
                        onChange={(e) =>
                          u((x) => {
                            const d = x.divisions.find((d) => d.id === div.id)!;
                            d.teams.find((tm) => tm.id === team.id)!.name = e.target.value;
                          })
                        }
                      />
                      <span className="text-xs text-slate-400">{team.players.length} spelers</span>
                      <button
                        className="btn-ghost text-xs"
                        onClick={() => {
                          setPlayerTeamId(team.id);
                          setModal("player");
                        }}
                      >
                        + speler
                      </button>
                      <button
                        className="btn-ghost text-red-500"
                        onClick={() =>
                          u((x) => {
                            const d = x.divisions.find((d) => d.id === div.id)!;
                            d.teams = d.teams.filter((tm) => tm.id !== team.id);
                          })
                        }
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <button className="btn-primary mt-4" onClick={() => setModal("team")}>Voeg team toe</button>
              </>
            )
          ) : (
            <>
              {div.players.length === 0 && (
                <EmptyState
                  icon="🧑"
                  title="Voeg spelers toe aan deze divisie"
                  subtitle="Bij een individuele sport loten spelers elke ronde nieuwe teams (bijv. 4x4)."
                />
              )}
              <div className="card divide-y divide-slate-100">
                {div.players.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-2">
                    <span className="w-6 text-xs text-slate-400">{i + 1}</span>
                    <input
                      className="input border-0"
                      value={p.name}
                      onChange={(e) =>
                        u((x) => {
                          const d = x.divisions.find((d) => d.id === div.id)!;
                          d.players.find((pl) => pl.id === p.id)!.name = e.target.value;
                        })
                      }
                    />
                    <button
                      className="btn-ghost text-red-500"
                      onClick={() =>
                        u((x) => {
                          const d = x.divisions.find((d) => d.id === div.id)!;
                          d.players = d.players.filter((pl) => pl.id !== p.id);
                        })
                      }
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <button
                className="btn-primary mt-4"
                onClick={() => {
                  setPlayerTeamId(null);
                  setModal("player");
                }}
              >
                Voeg speler toe
              </button>
            </>
          )}
        </>
      )}

      {tab === "scheidsrechters" && (
        <>
          {t.referees.length === 0 ? (
            <EmptyState
              icon="🦺"
              title="Voeg scheidsrechters toe"
              subtitle="Gebruik daarna de schema-pagina om de scheidsrechters toe te wijzen aan wedstrijden."
              action={
                <button className="btn-outline" onClick={() => setModal("referee")}>
                  Voeg scheidsrechter toe
                </button>
              }
            />
          ) : (
            <>
              <div className="card divide-y divide-slate-100">
                {t.referees.map((r, i) => (
                  <div key={r.id} className="flex items-center gap-3 px-4 py-2">
                    <span className="w-6 text-xs text-slate-400">{i + 1}</span>
                    <input
                      className="input border-0"
                      value={r.name}
                      onChange={(e) => u((x) => (x.referees.find((y) => y.id === r.id)!.name = e.target.value))}
                    />
                    <button
                      className="btn-ghost text-red-500"
                      onClick={() => u((x) => (x.referees = x.referees.filter((y) => y.id !== r.id)))}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <button className="btn-primary mt-4" onClick={() => setModal("referee")}>
                Voeg scheidsrechter toe
              </button>
            </>
          )}
        </>
      )}

      {tab === "beheerders" && (
        <>
          {t.admins.length === 0 ? (
            <EmptyState
              icon="👔"
              title="Voeg beheerders toe"
              subtitle="Zo kan je met meerdere toernooi-organisatoren aan dit toernooi werken, of alleen rechten geven om uitslagen in te vullen."
              action={<button className="btn-outline" onClick={() => setModal("admin")}>Beheerder toevoegen</button>}
            />
          ) : (
            <>
              <div className="card divide-y divide-slate-100">
                {t.admins.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 px-4 py-2">
                    <div className="flex-1">
                      <div className="font-medium">{a.name}</div>
                      <div className="text-xs text-slate-500">{a.email}</div>
                    </div>
                    <select
                      className="text-sm"
                      value={a.rights}
                      onChange={(e) =>
                        u((x) => (x.admins.find((y) => y.id === a.id)!.rights = e.target.value as "volledig" | "uitslagen"))
                      }
                    >
                      <option value="volledig">Volledige rechten</option>
                      <option value="uitslagen">Alleen uitslagen</option>
                    </select>
                    <button
                      className="btn-ghost text-red-500"
                      onClick={() => u((x) => (x.admins = x.admins.filter((y) => y.id !== a.id)))}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <button className="btn-primary mt-4" onClick={() => setModal("admin")}>Beheerder toevoegen</button>
            </>
          )}
        </>
      )}

      {modal === "team" && (
        <Modal title="Voeg team toe" onClose={() => setModal(null)}>
          <div className="mb-3 flex gap-4 text-sm font-semibold">
            <button
              className={`cursor-pointer border-b-2 pb-1 ${!bulkMode ? "" : "border-transparent text-slate-400"}`}
              style={!bulkMode ? { borderColor: "var(--accent)", color: "var(--accent)" } : undefined}
              onClick={() => setBulkMode(false)}
            >
              ÉÉN TEAM
            </button>
            <button
              className={`cursor-pointer border-b-2 pb-1 ${bulkMode ? "" : "border-transparent text-slate-400"}`}
              style={bulkMode ? { borderColor: "var(--accent)", color: "var(--accent)" } : undefined}
              onClick={() => setBulkMode(true)}
            >
              MEERDERE TEAMS
            </button>
          </div>
          {bulkMode ? (
            <textarea
              className="input h-32 resize-none border rounded p-2"
              placeholder={"Eén teamnaam per regel\nTeam A\nTeam B"}
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              autoFocus
            />
          ) : (
            <input
              className="input"
              placeholder="Naam"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && addTeams()}
            />
          )}
          <ModalActions onCancel={() => setModal(null)} onSubmit={addTeams} disabled={!nameInput.trim()} />
        </Modal>
      )}

      {modal === "referee" && (
        <Modal title="Voeg scheidsrechter toe" onClose={() => setModal(null)}>
          <input
            className="input"
            placeholder="Naam"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            autoFocus
          />
          <ModalActions
            onCancel={() => setModal(null)}
            onSubmit={() => {
              u((x) => x.referees.push({ id: uid(), name: nameInput.trim() }));
              setNameInput("");
              setModal(null);
            }}
            disabled={!nameInput.trim()}
          />
        </Modal>
      )}

      {modal === "admin" && (
        <Modal title="Beheerder toevoegen" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <input className="input" placeholder="Naam" value={nameInput} onChange={(e) => setNameInput(e.target.value)} autoFocus />
            <input className="input" placeholder="E-mail" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} />
          </div>
          <ModalActions
            onCancel={() => setModal(null)}
            onSubmit={() => {
              u((x) => x.admins.push({ id: uid(), name: nameInput.trim(), email: emailInput.trim(), rights: "volledig" }));
              setNameInput("");
              setEmailInput("");
              setModal(null);
            }}
            disabled={!nameInput.trim()}
          />
        </Modal>
      )}

      {modal === "player" && (
        <Modal title="Voeg spelers toe" onClose={() => setModal(null)}>
          <textarea
            className="input h-32 resize-none border rounded p-2"
            placeholder={"Eén naam per regel"}
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            autoFocus
          />
          <ModalActions
            onCancel={() => setModal(null)}
            onSubmit={() => {
              const names = nameInput.split("\n").map((s) => s.trim()).filter(Boolean);
              u((x) => {
                const d = x.divisions.find((d) => d.id === div.id)!;
                if (playerTeamId) {
                  const team = d.teams.find((tm) => tm.id === playerTeamId)!;
                  for (const n of names) team.players.push({ id: uid(), name: n });
                } else {
                  for (const n of names) d.players.push({ id: uid(), name: n });
                }
              });
              setNameInput("");
              setModal(null);
            }}
            disabled={!nameInput.trim()}
          />
        </Modal>
      )}
    </div>
  );
}
