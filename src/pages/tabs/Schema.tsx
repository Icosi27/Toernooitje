import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import type { Tournament } from "../../types";
import { useApp } from "../../store";
import { EmptyState, Modal, ModalActions } from "../../components/ui";
import { autoSchedule, scheduledMatches } from "../../logic/schedule";
import { allMatches, slotLabel } from "../../logic/resolve";
import { uid } from "../../logic/id";

export default function Schema() {
  const t = useOutletContext<Tournament>();
  const update = useApp((s) => s.updateTournament);
  const u = (fn: (t: Tournament) => void) => update(t.id, fn);

  const [fieldModal, setFieldModal] = useState(false);
  const [fieldName, setFieldName] = useState("");
  const [fieldStart, setFieldStart] = useState("");

  const hasMatches = t.divisions.some((d) => allMatches(d).length > 0);
  const rows = scheduledMatches(t).filter((r) => r.match.start);
  const unplanned = scheduledMatches(t).filter((r) => !r.match.start).length;

  const individualLineup = (m: { id: string }, d: (typeof t.divisions)[0]) => {
    for (const s of d.stages) {
      if (s.type === "individual" && s.lineups[m.id]) {
        const names = (ids: string[]) =>
          ids.map((id) => d.players.find((p) => p.id === id)?.name ?? "?").join(", ");
        return { a: names(s.lineups[m.id].a), b: names(s.lineups[m.id].b) };
      }
    }
    return null;
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h2 className="mr-auto text-xl font-bold">Speelschema</h2>
        <button className="btn-outline" onClick={() => setFieldModal(true)}>Veld toevoegen</button>
        <button
          className="btn-primary"
          disabled={t.fields.length === 0 || !hasMatches}
          title={
            t.fields.length === 0
              ? "Voeg eerst een veld toe"
              : !hasMatches
                ? "Maak eerst een indeling"
                : ""
          }
          onClick={() => u((x) => autoSchedule(x))}
        >
          ⚡ Plan automatisch
        </button>
      </div>

      {t.fields.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {t.fields.map((f) => (
            <span key={f.id} className="card flex items-center gap-2 px-3 py-1.5 text-sm">
              🟩 {f.name}
              {f.startTime && <span className="text-xs text-slate-400">vanaf {f.startTime}</span>}
              <button
                className="cursor-pointer text-slate-400 hover:text-red-500"
                onClick={() =>
                  u((x) => {
                    x.fields = x.fields.filter((y) => y.id !== f.id);
                    for (const d of x.divisions)
                      for (const m of allMatches(d)) if (m.fieldId === f.id) m.fieldId = undefined;
                  })
                }
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      {t.fields.length === 0 && (
        <EmptyState
          icon="🟩"
          title="Voeg velden toe"
          subtitle="Daarna kan je de automatische planner gebruiken om de wedstrijden te roosteren."
          action={<button className="btn-outline" onClick={() => setFieldModal(true)}>Veld toevoegen</button>}
        />
      )}

      {t.fields.length > 0 && !hasMatches && (
        <EmptyState
          icon="📅"
          title="Er zijn nog geen wedstrijden om in te plannen"
          subtitle="Maak eerst een toernooi-indeling."
        />
      )}

      {rows.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                <th className="px-3 py-2">Tijd</th>
                <th className="px-3 py-2">Veld</th>
                <th className="px-3 py-2">Divisie</th>
                <th className="px-3 py-2">Wedstrijd</th>
                <th className="px-3 py-2">Scheidsrechter</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ match: m, division: d }) => {
                const lineup = individualLineup(m, d);
                return (
                  <tr key={m.id} className="border-b border-slate-100">
                    <td className="px-3 py-2">
                      <input
                        type="time"
                        value={m.start ?? ""}
                        className="cursor-pointer bg-transparent"
                        onChange={(e) =>
                          u((x) => {
                            for (const dd of x.divisions) {
                              const mm = allMatches(dd).find((y) => y.id === m.id);
                              if (mm) mm.start = e.target.value;
                            }
                          })
                        }
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={m.fieldId ?? ""}
                        className="cursor-pointer bg-transparent"
                        onChange={(e) =>
                          u((x) => {
                            for (const dd of x.divisions) {
                              const mm = allMatches(dd).find((y) => y.id === m.id);
                              if (mm) mm.fieldId = e.target.value || undefined;
                            }
                          })
                        }
                      >
                        <option value="">—</option>
                        {t.fields.map((f) => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2 text-slate-500">{d.name}</td>
                    <td className="px-3 py-2">
                      {lineup ? (
                        <span className="text-xs">
                          <b>{lineup.a}</b> — <b>{lineup.b}</b>
                        </span>
                      ) : (
                        <>
                          {slotLabel(m.a, d, t.scoring)} — {slotLabel(m.b, d, t.scoring)}
                        </>
                      )}
                      {m.label && <span className="ml-2 text-xs text-slate-400">{m.label}</span>}
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={m.refereeId ?? ""}
                        className="cursor-pointer bg-transparent"
                        onChange={(e) =>
                          u((x) => {
                            for (const dd of x.divisions) {
                              const mm = allMatches(dd).find((y) => y.id === m.id);
                              if (mm) mm.refereeId = e.target.value || undefined;
                            }
                          })
                        }
                      >
                        <option value="">—</option>
                        {t.referees.map((r) => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {unplanned > 0 && rows.length > 0 && (
        <p className="mt-3 text-sm text-slate-500">
          Nog {unplanned} wedstrijd(en) niet ingepland — klik op "Plan automatisch".
        </p>
      )}

      {fieldModal && (
        <Modal title="Veld toevoegen" onClose={() => setFieldModal(false)}>
          <div className="space-y-4">
            <input
              className="input"
              placeholder="Naam (bijv. Veld 1)"
              value={fieldName}
              onChange={(e) => setFieldName(e.target.value)}
              autoFocus
            />
            <div>
              <label className="label">Starttijd (optioneel, anders toernooistart {t.startTime})</label>
              <input type="time" className="input" value={fieldStart} onChange={(e) => setFieldStart(e.target.value)} />
            </div>
          </div>
          <ModalActions
            onCancel={() => setFieldModal(false)}
            onSubmit={() => {
              u((x) => x.fields.push({ id: uid(), name: fieldName.trim(), startTime: fieldStart || undefined }));
              setFieldName("");
              setFieldStart("");
              setFieldModal(false);
            }}
            disabled={!fieldName.trim()}
          />
        </Modal>
      )}
    </div>
  );
}
