import { useOutletContext } from "react-router-dom";
import type { TiebreakCriterion, Tournament } from "../../types";
import { useApp } from "../../store";
import { Section } from "../../components/ui";
import { criterionLabels } from "../../logic/standings";
import { uid } from "../../logic/id";

export default function Algemeen() {
  const t = useOutletContext<Tournament>();
  const update = useApp((s) => s.updateTournament);
  const u = (fn: (t: Tournament) => void) => update(t.id, fn);

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="mb-1 font-bold">Toernooinaam</h2>
      <input className="input mb-6" value={t.name} onChange={(e) => u((x) => (x.name = e.target.value))} />

      <h2 className="mb-2 font-bold">Wedstrijddagen</h2>
      <div className="mb-2 space-y-2">
        {t.days.map((d, i) => (
          <div key={i} className="card flex items-center gap-3 px-3 py-2">
            <span className="rounded bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-600">{i + 1}</span>
            <input
              type="date"
              className="input border-0"
              value={d}
              onChange={(e) => u((x) => (x.days[i] = e.target.value))}
            />
            {t.days.length > 1 && (
              <button className="btn-ghost" onClick={() => u((x) => x.days.splice(i, 1))}>✕</button>
            )}
          </div>
        ))}
      </div>
      <button className="btn-outline mb-6 w-full" onClick={() => u((x) => x.days.push(x.days[x.days.length - 1]))}>
        Dag toevoegen
      </button>

      <h2 className="mb-2 font-bold">Locaties</h2>
      <div className="mb-2 space-y-2">
        {t.locations.map((l, i) => (
          <div key={i} className="card flex items-center gap-3 px-3 py-2">
            <span className="rounded bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-600">{i + 1}</span>
            <input className="input border-0" value={l} onChange={(e) => u((x) => (x.locations[i] = e.target.value))} />
            <button className="btn-ghost" onClick={() => u((x) => x.locations.splice(i, 1))}>✕</button>
          </div>
        ))}
      </div>
      <button className="btn-outline mb-4 w-full" onClick={() => u((x) => x.locations.push(""))}>
        Locatie toevoegen
      </button>
      <label className="mb-6 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={t.esport} onChange={(e) => u((x) => (x.esport = e.target.checked))} />
        Dit is een online (eSport) toernooi
      </label>

      <h2 className="mb-2 font-bold">Divisies</h2>
      <div className="mb-2 space-y-2">
        {t.divisions.map((d, i) => (
          <div key={d.id} className="card flex items-center gap-3 px-3 py-2">
            <span
              className="rounded px-2 py-0.5 text-xs font-bold text-white"
              style={{ background: `hsl(${(i * 47 + 10) % 360} 70% 55%)` }}
            >
              {i + 1}
            </span>
            <input
              className="input border-0"
              value={d.name}
              onChange={(e) => u((x) => (x.divisions[i].name = e.target.value))}
            />
            {t.divisions.length > 1 && (
              <button
                className="btn-ghost"
                onClick={() => {
                  if (confirm(`Divisie "${d.name}" en alle teams/wedstrijden erin verwijderen?`))
                    u((x) => x.divisions.splice(i, 1));
                }}
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        className="btn-outline mb-6 w-full"
        onClick={() =>
          u((x) =>
            x.divisions.push({
              id: uid(),
              name: `Divisie ${x.divisions.length + 1}`,
              teams: [],
              players: [],
              individualMode: false,
              stages: [],
            })
          )
        }
      >
        Divisie toevoegen
      </button>

      <Section title="Doelgroep" subtitle="Extra informatie om het toernooi beter vindbaar te maken">
        <div className="space-y-4">
          <div>
            <label className="label">Sport of eSport</label>
            <input className="input" value={t.sport} onChange={(e) => u((x) => (x.sport = e.target.value))} />
          </div>
          <div>
            <label className="label">Geslacht</label>
            <select
              className="input"
              value={t.gender ?? ""}
              onChange={(e) => u((x) => (x.gender = e.target.value || undefined))}
            >
              <option value="">—</option>
              <option>Gemengd</option>
              <option>Mannen</option>
              <option>Vrouwen</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Leeftijd min</label>
              <input
                type="number"
                className="input"
                value={t.ageMin ?? ""}
                onChange={(e) => u((x) => (x.ageMin = e.target.value ? +e.target.value : undefined))}
              />
            </div>
            <div>
              <label className="label">Leeftijd max</label>
              <input
                type="number"
                className="input"
                value={t.ageMax ?? ""}
                onChange={(e) => u((x) => (x.ageMax = e.target.value ? +e.target.value : undefined))}
              />
            </div>
          </div>
          <div>
            <label className="label">Niveau</label>
            <div className="flex gap-1 text-2xl">
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  onClick={() => u((x) => (x.level = x.level === n ? undefined : n))}
                  className="cursor-pointer"
                >
                  {t.level && t.level >= n ? "⭐" : "☆"}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Plaats</label>
              <input className="input" value={t.city ?? ""} onChange={(e) => u((x) => (x.city = e.target.value))} />
            </div>
            <div>
              <label className="label">Land</label>
              <input className="input" value={t.country ?? ""} onChange={(e) => u((x) => (x.country = e.target.value))} />
            </div>
          </div>
        </div>
      </Section>

      <Section
        title="Puntentelling"
        subtitle="Punten bij winst/gelijkspel/verlies en de rangschikkingscriteria in poules"
      >
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Bij winst</label>
            <input
              type="number"
              className="input"
              value={t.scoring.win}
              onChange={(e) => u((x) => (x.scoring.win = +e.target.value))}
            />
          </div>
          <div>
            <label className="label">Bij gelijkspel</label>
            <input
              type="number"
              className="input"
              value={t.scoring.draw}
              onChange={(e) => u((x) => (x.scoring.draw = +e.target.value))}
            />
          </div>
          <div>
            <label className="label">Bij verlies</label>
            <input
              type="number"
              className="input"
              value={t.scoring.loss}
              onChange={(e) => u((x) => (x.scoring.loss = +e.target.value))}
            />
          </div>
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={t.scoring.shootouts}
            onChange={(e) => u((x) => (x.scoring.shootouts = e.target.checked))}
          />
          Voer scores van strafschoppenserie in bij gelijk geëindigde KO-wedstrijden
        </label>
        <div className="mt-4">
          <p className="mb-2 text-sm font-semibold">Rangschikking in poules</p>
          <p className="mb-2 text-xs text-slate-500">
            Sleep-volgorde van criteria wanneer teams gelijk eindigen (klik ↑ om te verhogen):
          </p>
          <div className="space-y-1">
            {t.scoring.criteria.map((c, i) => (
              <div key={c} className="flex items-center gap-2 rounded bg-slate-100 px-3 py-1.5 text-sm">
                <span className="w-4 text-xs text-slate-400">{i + 1}</span>
                <span className="flex-1">{criterionLabels[c as TiebreakCriterion]}</span>
                {i > 0 && (
                  <button
                    className="cursor-pointer text-slate-500 hover:text-slate-900"
                    onClick={() =>
                      u((x) => {
                        const arr = x.scoring.criteria;
                        [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
                      })
                    }
                  >
                    ↑
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Wedstrijdduur" subtitle="Gebruikt door de automatische planner op de Schema-pagina">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Starttijd</label>
            <input
              type="time"
              className="input"
              value={t.startTime}
              onChange={(e) => u((x) => (x.startTime = e.target.value))}
            />
          </div>
          <div>
            <label className="label">Duur (min)</label>
            <input
              type="number"
              className="input"
              value={t.matchDuration}
              onChange={(e) => u((x) => (x.matchDuration = +e.target.value))}
            />
          </div>
          <div>
            <label className="label">Pauze ertussen (min)</label>
            <input
              type="number"
              className="input"
              value={t.breakBetween}
              onChange={(e) => u((x) => (x.breakBetween = +e.target.value))}
            />
          </div>
        </div>
      </Section>
    </div>
  );
}
