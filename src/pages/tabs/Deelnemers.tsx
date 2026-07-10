import { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import type { Tournament } from "../../types";
import { useApp } from "../../store";
import { EmptyState, Modal, ModalActions, Section, Toggle, useDivIdx } from "../../components/ui";
import { appUrl, copyText } from "../../logic/share";
import { decideRegistration, getClient, liveQuery, registerRefToken } from "../../logic/cloud";
import { removeTeamEverywhere, teamInStages, withdrawTeam } from "../../logic/withdraw";
import { fileToDataUrl } from "../../logic/files";
import { KitIcon, TeamBadge } from "../../components/TeamBadge";
import { uid } from "../../logic/id";

type Tab = "teams" | "scheidsrechters" | "beheerders" | "inschrijvingen";

export default function Deelnemers() {
  const t = useOutletContext<Tournament>();
  const update = useApp((s) => s.updateTournament);
  const u = (fn: (t: Tournament) => void) => update(t.id, fn);

  const [tab, setTab] = useState<Tab>("teams");
  const [divIdx, setDivIdx] = useDivIdx(t.id, t.divisions.length);
  const [modal, setModal] = useState<
    null | "team" | "referee" | "admin" | "player" | "editTeam" | "editReferee"
  >(null);
  const [editTeamId, setEditTeamId] = useState<string | null>(null);
  const [editRefId, setEditRefId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [bulkMode, setBulkMode] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [playerTeamId, setPlayerTeamId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (key: string, url: string) => {
    if (await copyText(url)) {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    }
  };

  /**
   * Unieke scheidslink per scheidsrechter(-team), klaar voor WhatsApp of
   * e-mail. Online krijgt de link een eigen token dat alléén uitslagen van de
   * eigen wedstrijden mag schrijven; alleen als de server die tokens (nog)
   * niet kent, valt hij terug op de oude link met de toernooisleutel.
   */
  const copyRefLink = async (copyKey: string, refId: string) => {
    let qs = "";
    if (t.cloud?.online) {
      const token = t.cloud.refTokens?.[refId] ?? uid() + uid();
      try {
        const sb = getClient();
        if (!sb) throw new Error("geen verbinding");
        await registerRefToken(sb, t.id, t.cloud.writeKey, refId, token);
        u((x) => {
          if (x.cloud) (x.cloud.refTokens ??= {})[refId] = token;
        });
        qs = `${liveQuery(t, false)}&rt=${encodeURIComponent(token)}`;
      } catch {
        qs = liveQuery(t, true);
      }
    }
    copy(copyKey, appUrl(`/scheids/${t.id}/${refId}${qs}`));
  };

  const div = t.divisions[Math.min(divIdx, t.divisions.length - 1)];
  const fields = t.teamFields ?? { present: true, paid: true, email: false };
  const setField = (key: keyof typeof fields, v: boolean) =>
    u((x) => (x.teamFields = { ...(x.teamFields ?? fields), [key]: v }));

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
        {(["teams", "scheidsrechters", "beheerders", "inschrijvingen"] as Tab[]).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`flex-1 cursor-pointer border-b-2 py-3 text-sm font-semibold uppercase tracking-wide ${
              tab === k ? "" : "border-transparent text-slate-500"
            }`}
            style={tab === k ? { borderColor: "var(--accent)", color: "var(--accent)" } : undefined}
          >
            {k}
            {k === "inschrijvingen" &&
              (t.registrations ?? []).filter((r) => r.status === "nieuw").length > 0 && (
                <span className="ml-1 rounded-full bg-red-500 px-1.5 text-xs text-white">
                  {(t.registrations ?? []).filter((r) => r.status === "nieuw").length}
                </span>
              )}
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

          {!div.individualMode && (
            <div className="card mb-4 px-4">
              <Section
                title="Informatie over de teams"
                subtitle="Geef aan welke administratie je per team wilt bijhouden"
              >
                <div className="flex flex-wrap gap-6 pb-2">
                  <Toggle checked={fields.present} onChange={(v) => setField("present", v)} label="Aanwezig" />
                  <Toggle checked={fields.paid} onChange={(v) => setField("paid", v)} label="Betaald" />
                  <Toggle checked={fields.email} onChange={(v) => setField("email", v)} label="E-mail" />
                </div>
              </Section>
            </div>
          )}

          {!div.individualMode && div.teams.length > 0 && (fields.present || fields.paid) && (
            <div className="mb-3 flex gap-4 text-sm text-slate-600">
              {fields.present && (
                <span>
                  ✅ <b>{div.teams.filter((tm) => tm.present).length}</b>/{div.teams.length} aanwezig
                </span>
              )}
              {fields.paid && (
                <span>
                  💶 <b>{div.teams.filter((tm) => tm.paid).length}</b>/{div.teams.length} betaald
                </span>
              )}
            </div>
          )}

          {!div.individualMode ? (
            div.teams.length === 0 ? (
              <EmptyState
                icon="👕"
                title="Voeg teams toe aan deze divisie"
                subtitle="Of begin met het maken van een indeling en voeg de teams later toe."
                action={
                  <div className="flex flex-col items-center gap-3">
                    <button className="btn-outline" onClick={() => setModal("team")}>Voeg team toe</button>
                    <button
                      className="cursor-pointer text-xs text-slate-500 underline"
                      onClick={() =>
                        u((x) => (x.divisions.find((d) => d.id === div.id)!.individualMode = true))
                      }
                    >
                      Geen teamsport? Klik hier om over te schakelen naar een individuele sport.
                    </button>
                  </div>
                }
              />
            ) : (
              <>
                <div className="card divide-y divide-slate-100">
                  {div.teams.map((team, i) => (
                    <div key={team.id} className="flex items-center gap-3 px-4 py-2">
                      <span className="w-6 text-xs text-slate-400">{i + 1}</span>
                      <TeamBadge team={team} size={22} />
                      {team.withdrawn && (
                        <span
                          className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500"
                          title="Openstaande wedstrijden zijn reglementair naar de tegenstander gegaan"
                        >
                          teruggetrokken
                        </span>
                      )}
                      <input
                        className={`input border-0 font-medium ${team.withdrawn ? "text-slate-400 line-through" : ""}`}
                        value={team.name}
                        onChange={(e) =>
                          u((x) => {
                            const d = x.divisions.find((d) => d.id === div.id)!;
                            d.teams.find((tm) => tm.id === team.id)!.name = e.target.value;
                          })
                        }
                      />
                      {fields.email && (
                        <input
                          className="input w-44 border-0 text-xs text-slate-500"
                          placeholder="e-mail"
                          value={team.email ?? ""}
                          onChange={(e) =>
                            u((x) => {
                              const d = x.divisions.find((d) => d.id === div.id)!;
                              const tm = d.teams.find((y) => y.id === team.id)!;
                              tm.email = e.target.value || undefined;
                            })
                          }
                        />
                      )}
                      {fields.present && (
                        <label
                          className="flex cursor-pointer items-center gap-1 text-xs text-slate-500"
                          title="Team is aanwezig gemeld"
                        >
                          <input
                            type="checkbox"
                            checked={!!team.present}
                            onChange={(e) =>
                              u((x) => {
                                const d = x.divisions.find((d) => d.id === div.id)!;
                                d.teams.find((y) => y.id === team.id)!.present = e.target.checked;
                              })
                            }
                          />
                          aanw.
                        </label>
                      )}
                      {fields.paid && (
                        <label
                          className="flex cursor-pointer items-center gap-1 text-xs text-slate-500"
                          title="Inschrijfgeld betaald"
                        >
                          <input
                            type="checkbox"
                            checked={!!team.paid}
                            onChange={(e) =>
                              u((x) => {
                                const d = x.divisions.find((d) => d.id === div.id)!;
                                d.teams.find((y) => y.id === team.id)!.paid = e.target.checked;
                              })
                            }
                          />
                          betaald
                        </label>
                      )}
                      <span className="text-xs text-slate-400">{team.players.length} spelers</span>
                      <button
                        className="btn-ghost text-xs"
                        title="Logo en tenuekleuren instellen"
                        onClick={() => {
                          setEditTeamId(team.id);
                          setModal("editTeam");
                        }}
                      >
                        ✎ logo/tenue
                      </button>
                      <button
                        className="btn-ghost text-xs"
                        onClick={() => {
                          setPlayerTeamId(team.id);
                          setModal("player");
                        }}
                      >
                        + speler
                      </button>
                      {t.teamsAsReferees && (
                        <button
                          className="btn-ghost text-xs"
                          title="Scheidslink: hier vult dit team de uitslagen in van de wedstrijden die het fluit"
                          onClick={() => copyRefLink(`ref-${team.id}`, team.id)}
                        >
                          {copied === `ref-${team.id}` ? "✓ gekopieerd" : "🔗 scheidslink"}
                        </button>
                      )}
                      {!team.withdrawn && teamInStages(div, team.id) && (
                        <button
                          className="btn-ghost text-xs text-amber-600"
                          title="Team valt uit: openstaande wedstrijden gaan reglementair (3–0) naar de tegenstander; gespeelde uitslagen blijven staan"
                          onClick={() => {
                            if (
                              !confirm(
                                `"${team.name}" trekt zich terug?\n\nOpenstaande wedstrijden gaan reglementair (3–0) naar de tegenstander. Gespeelde uitslagen blijven staan.`
                              )
                            )
                              return;
                            u((x) => {
                              const d = x.divisions.find((d) => d.id === div.id)!;
                              withdrawTeam(d, team.id);
                            });
                          }}
                        >
                          🚪 valt uit
                        </button>
                      )}
                      <button
                        className="btn-ghost text-red-500"
                        onClick={() => {
                          const inStages = teamInStages(div, team.id);
                          if (
                            !confirm(
                              inStages
                                ? `Team "${team.name}" verwijderen?\n\nHet team verdwijnt ook uit de poule-indeling en openstaande wedstrijden worden geschrapt. Valt het team alleen uit? Gebruik dan "valt uit".`
                                : `Team "${team.name}" verwijderen?`
                            )
                          )
                            return;
                          u((x) => {
                            const d = x.divisions.find((d) => d.id === div.id)!;
                            removeTeamEverywhere(d, team.id);
                          });
                        }}
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
                  subtitle="Bij een individuele sport loten spelers elke ronde nieuwe teams (bijv. 4x4). Punten tellen per speler; de beste speler wint het toernooi."
                  action={
                    <button
                      className="cursor-pointer text-xs text-slate-500 underline"
                      onClick={() =>
                        u((x) => (x.divisions.find((d) => d.id === div.id)!.individualMode = false))
                      }
                    >
                      Toch een teamsport? Klik hier om terug te schakelen naar teams.
                    </button>
                  }
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
          <div className="card mb-4 flex flex-wrap items-center justify-between gap-4 p-4">
            <div>
              <div className="font-semibold">Teams als scheidsrechters</div>
              <p className="mt-1 text-xs text-slate-500">
                {t.teamsAsReferees
                  ? "De planner wijst per wedstrijd een team uit dezelfde divisie aan dat op dat moment vrij is (eerlijk verdeeld). Kopieer de scheidslink per team op het Teams-tabblad."
                  : "Geen eigen scheidsrechters? Laat teams elkaars wedstrijden fluiten — de planner verdeelt de fluitbeurten eerlijk."}
              </p>
            </div>
            <Toggle
              checked={!!t.teamsAsReferees}
              onChange={(v) => u((x) => (x.teamsAsReferees = v))}
              label={t.teamsAsReferees ? "Aan" : "Uit"}
            />
          </div>

          <div className="card mb-4 flex flex-wrap items-center justify-between gap-4 p-4">
            <div>
              <div className="font-semibold">Live scoren tijdens de wedstrijd</div>
              <p className="mt-1 text-xs text-slate-500">
                {t.liveScoring
                  ? "Scheidsrechters houden de score doelpunt voor doelpunt bij (▶ Start wedstrijd, +1-knoppen, 🏁 Eindstand). Het publiek volgt de tussenstand live; de uitslag telt pas mee na de eindstand."
                  : "Uit = scheidsrechters voeren de uitslag achteraf in met de Opslaan-knop. Zet aan als je met je scheidsrechters afspreekt dat ze live scoren, zodat het publiek de tussenstand kan volgen."}
              </p>
            </div>
            <Toggle
              checked={!!t.liveScoring}
              onChange={(v) => u((x) => (x.liveScoring = v))}
              label={t.liveScoring ? "Live" : "Achteraf"}
            />
          </div>

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
              <div className={`card divide-y divide-slate-100 ${t.teamsAsReferees ? "opacity-60" : ""}`}>
                {t.referees.map((r, i) => {
                  const veldNames = (r.fieldIds ?? [])
                    .map((id) => t.fields.find((f) => f.id === id)?.name)
                    .filter(Boolean);
                  const divNames = (r.divisionIds ?? [])
                    .map((id) => t.divisions.find((d) => d.id === id)?.name)
                    .filter(Boolean);
                  return (
                  <div key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-2">
                    <span className="w-6 text-xs text-slate-400">{i + 1}</span>
                    <input
                      className="input w-40 border-0"
                      value={r.name}
                      onChange={(e) => u((x) => (x.referees.find((y) => y.id === r.id)!.name = e.target.value))}
                    />
                    <span className="text-xs text-slate-500">
                      {veldNames.length ? veldNames.join(", ") : "Alle velden"}
                    </span>
                    <span className="text-xs text-slate-500">
                      · {divNames.length ? divNames.join(", ") : "Alle divisies"}
                    </span>
                    {r.maxMatches !== undefined && (
                      <span className="text-xs text-slate-500">· max {r.maxMatches}</span>
                    )}
                    <button
                      className="btn-ghost text-xs"
                      title="Velden, divisies en maximum aantal wedstrijden instellen"
                      onClick={() => {
                        setEditRefId(r.id);
                        setModal("editReferee");
                      }}
                    >
                      ✎ voorkeuren
                    </button>
                    <button
                      className="btn-ghost text-xs"
                      title="Inloglink: pagina waar deze scheidsrechter zijn uitslagen invult"
                      onClick={() => copyRefLink(r.id, r.id)}
                    >
                      {copied === r.id ? "✓ gekopieerd" : "🔗 inloglink"}
                    </button>
                    <button
                      className="btn-ghost text-red-500"
                      onClick={() => {
                        if (!confirm(`Scheidsrechter "${r.name}" verwijderen?`)) return;
                        u((x) => (x.referees = x.referees.filter((y) => y.id !== r.id)));
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  );
                })}
              </div>
              {t.teamsAsReferees && (
                <p className="mt-2 text-xs text-amber-700">
                  De schakelaar "Teams als scheidsrechters" staat aan: de planner gebruikt de teams
                  en slaat deze lijst over.
                </p>
              )}
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
                      className="btn-ghost text-xs"
                      title="Invoerlink: pagina om uitslagen in te vullen"
                      onClick={() => copy(a.id, appUrl(`/invoer/${t.id}${liveQuery(t, true)}`))}
                    >
                      {copied === a.id ? "✓ gekopieerd" : "🔗 invoerlink"}
                    </button>
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

      {tab === "inschrijvingen" && (
        <>
          <div className="card mb-4 flex items-center justify-between gap-4 p-4">
            <div>
              <div className="font-semibold">Online inschrijfpagina</div>
              <p className="mt-1 text-xs text-slate-500">
                Teams schrijven zichzelf in via een link; jij accepteert ze hier en ze worden
                automatisch als team toegevoegd.
                {!t.cloud?.online && (
                  <>
                    {" "}
                    <Link to={`/t/${t.id}/presentatie`} className="underline">
                      Zet het toernooi live
                    </Link>{" "}
                    zodat de link ook op andere telefoons werkt.
                  </>
                )}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <Toggle
                checked={!!t.registrationOpen}
                onChange={(v) => u((x) => (x.registrationOpen = v))}
                label={t.registrationOpen ? "Open" : "Gesloten"}
              />
              <button
                className="btn-primary"
                disabled={!t.registrationOpen}
                onClick={() => copy("reglink", appUrl(`/inschrijven/${t.id}${liveQuery(t, false)}`))}
              >
                {copied === "reglink" ? "✓ Gekopieerd" : "Kopieer inschrijflink"}
              </button>
            </div>
          </div>

          <div className="card mb-6 p-4">
            <label className="label">Tekst bovenaan het inschrijfformulier (optioneel)</label>
            <textarea
              className="input h-16 resize-none rounded border border-slate-200 p-2"
              placeholder="Bijv.: Inschrijven kan tot 1 augustus. Deelname kost € 25 per team."
              value={t.registrationInfo ?? ""}
              onChange={(e) => u((x) => (x.registrationInfo = e.target.value))}
            />
          </div>

          {(t.registrations ?? []).length === 0 ? (
            <EmptyState
              icon="📝"
              title="Nog geen inschrijvingen"
              subtitle="Deel de inschrijflink; aanmeldingen verschijnen hier vanzelf."
            />
          ) : (
            <div className="card divide-y divide-slate-100">
              {(t.registrations ?? [])
                .slice()
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                .map((r) => {
                  const divName = t.divisions.find((d) => d.id === r.divisionId)?.name;
                  return (
                    <div key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                      {(r.logo || r.shirtColor) && (
                        <span className="flex shrink-0 items-center gap-1" title="Door het team doorgegeven logo/tenue">
                          {r.logo && <img src={r.logo} alt="" className="h-7 w-7 rounded object-contain" />}
                          {r.shirtColor && <KitIcon shirt={r.shirtColor} shorts={r.shortsColor} size={24} />}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-medium">
                          {r.teamName}
                          {divName && <span className="ml-2 text-xs text-slate-400">{divName}</span>}
                        </div>
                        <div className="text-xs text-slate-500">
                          {[r.contact, r.email, r.phone].filter(Boolean).join(" · ") || "geen contactgegevens"}
                          {" · "}
                          {new Date(r.createdAt).toLocaleDateString("nl-NL")}
                        </div>
                        {r.note && <div className="mt-1 text-xs italic text-slate-500">"{r.note}"</div>}
                      </div>
                      {r.status === "nieuw" ? (
                        <div className="flex gap-2">
                          <button
                            className="btn-primary"
                            onClick={() => {
                              u((x) => {
                                const reg = (x.registrations ?? []).find((y) => y.id === r.id);
                                if (!reg) return;
                                reg.status = "geaccepteerd";
                                const d =
                                  x.divisions.find((dd) => dd.id === reg.divisionId) ?? x.divisions[0];
                                if (d.individualMode) {
                                  d.players.push({ id: uid(), name: reg.teamName });
                                } else {
                                  d.teams.push({
                                    id: uid(),
                                    name: reg.teamName,
                                    email: reg.email,
                                    shirtColor: reg.shirtColor,
                                    shortsColor: reg.shortsColor,
                                    logo: reg.logo,
                                    players: [],
                                  });
                                }
                              });
                              decideRegistration(t.id, r.id, "geaccepteerd");
                            }}
                          >
                            Accepteer
                          </button>
                          <button
                            className="btn-ghost text-red-500"
                            onClick={() => {
                              u((x) => {
                                const reg = (x.registrations ?? []).find((y) => y.id === r.id);
                                if (reg) reg.status = "afgewezen";
                              });
                              decideRegistration(t.id, r.id, "afgewezen");
                            }}
                          >
                            Wijs af
                          </button>
                        </div>
                      ) : r.status === "geaccepteerd" ? (
                        <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">
                          ✓ Geaccepteerd
                        </span>
                      ) : (
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                          Afgewezen
                        </span>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </>
      )}

      {modal === "editTeam" &&
        editTeamId &&
        (() => {
          const team = div.teams.find((tm) => tm.id === editTeamId);
          if (!team) return null;
          const setTeam = (fn: (tm: (typeof div.teams)[0]) => void) =>
            u((x) => {
              const d = x.divisions.find((d) => d.id === div.id)!;
              const tm = d.teams.find((y) => y.id === editTeamId);
              if (tm) fn(tm);
            });
          return (
            <Modal title={`${team.name} — logo & tenue`} onClose={() => setModal(null)}>
              <div className="space-y-5">
                <div>
                  <label className="label">Teamlogo</label>
                  <div className="flex items-center gap-4">
                    {team.logo ? (
                      <img src={team.logo} alt="logo" className="h-16 w-16 rounded border border-slate-200 object-contain p-1" />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded border border-dashed border-slate-300 text-2xl text-slate-300">
                        🛡️
                      </div>
                    )}
                    <div className="flex flex-col gap-2">
                      <label className="btn-outline cursor-pointer">
                        Uploaden
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (f) {
                              const url = await fileToDataUrl(f, 128);
                              setTeam((tm) => (tm.logo = url));
                            }
                          }}
                        />
                      </label>
                      {team.logo && (
                        <button className="btn-ghost text-xs text-red-500" onClick={() => setTeam((tm) => (tm.logo = undefined))}>
                          Verwijder logo
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="label">Tenue</label>
                  <div className="flex items-center gap-5">
                    <KitIcon shirt={team.shirtColor ?? "#94a3b8"} shorts={team.shortsColor ?? "#e2e8f0"} size={56} />
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={team.shirtColor ?? "#94a3b8"}
                          className="h-8 w-14 cursor-pointer rounded border border-slate-200"
                          onChange={(e) => setTeam((tm) => (tm.shirtColor = e.target.value))}
                        />
                        <span className="text-sm">Shirt</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={team.shortsColor ?? "#e2e8f0"}
                          className="h-8 w-14 cursor-pointer rounded border border-slate-200"
                          onChange={(e) => setTeam((tm) => (tm.shortsColor = e.target.value))}
                        />
                        <span className="text-sm">Broekje</span>
                      </div>
                      {(team.shirtColor || team.shortsColor) && (
                        <button
                          className="cursor-pointer text-xs text-slate-400 underline"
                          onClick={() =>
                            setTeam((tm) => {
                              tm.shirtColor = undefined;
                              tm.shortsColor = undefined;
                            })
                          }
                        >
                          kleuren wissen
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="label">E-mail (contactpersoon)</label>
                  <input
                    className="input"
                    value={team.email ?? ""}
                    onChange={(e) => setTeam((tm) => (tm.email = e.target.value || undefined))}
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button className="btn-primary" onClick={() => setModal(null)}>
                  Klaar
                </button>
              </div>
            </Modal>
          );
        })()}

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

      {modal === "editReferee" &&
        editRefId &&
        (() => {
          const ref = t.referees.find((r) => r.id === editRefId);
          if (!ref) return null;
          const setRef = (fn: (r: (typeof t.referees)[0]) => void) =>
            u((x) => {
              const rr = x.referees.find((y) => y.id === editRefId);
              if (rr) fn(rr);
            });
          const toggleIn = (list: string[] | undefined, id: string): string[] | undefined => {
            const cur = list ?? [];
            const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
            return next.length ? next : undefined;
          };
          return (
            <Modal title={`${ref.name} — voorkeuren`} onClose={() => setModal(null)}>
              <div className="space-y-5">
                <div>
                  <label className="label">Locaties en velden</label>
                  <p className="mb-2 text-xs text-slate-500">Niets aangevinkt = alle velden.</p>
                  {t.fields.length === 0 && (
                    <p className="text-xs text-slate-400">Nog geen velden (Schema-pagina).</p>
                  )}
                  <div className="grid grid-cols-2 gap-1">
                    {t.fields.map((f) => (
                      <label key={f.id} className="flex cursor-pointer items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={(ref.fieldIds ?? []).includes(f.id)}
                          onChange={() => setRef((r) => (r.fieldIds = toggleIn(r.fieldIds, f.id)))}
                        />
                        {f.name}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label">Divisies</label>
                  <p className="mb-2 text-xs text-slate-500">Niets aangevinkt = alle divisies.</p>
                  <div className="grid grid-cols-2 gap-1">
                    {t.divisions.map((d) => (
                      <label key={d.id} className="flex cursor-pointer items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={(ref.divisionIds ?? []).includes(d.id)}
                          onChange={() =>
                            setRef((r) => (r.divisionIds = toggleIn(r.divisionIds, d.id)))
                          }
                        />
                        {d.name}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label">Maximaal aantal wedstrijden (leeg = onbeperkt)</label>
                  <input
                    type="number"
                    min={0}
                    className="input w-24"
                    value={ref.maxMatches ?? ""}
                    onChange={(e) =>
                      setRef((r) => (r.maxMatches = e.target.value === "" ? undefined : Math.max(0, +e.target.value)))
                    }
                  />
                </div>
                <p className="text-xs text-slate-400">
                  De planner past dit toe bij "Plan automatisch"; handmatige toewijzingen blijven
                  altijd staan.
                </p>
              </div>
              <div className="mt-6 flex justify-end">
                <button className="btn-primary" onClick={() => setModal(null)}>Klaar</button>
              </div>
            </Modal>
          );
        })()}

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
