import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../store";

/** 3-staps wizard zoals Tournify: naam+dagen, locaties, divisies. */
export default function Wizard() {
  const nav = useNavigate();
  const createTournament = useApp((s) => s.createTournament);
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [days, setDays] = useState<string[]>([new Date().toISOString().slice(0, 10)]);
  const [locations, setLocations] = useState<string[]>([""]);
  const [esport, setEsport] = useState(false);
  const [individual, setIndividual] = useState(false);
  const [divisions, setDivisions] = useState<string[]>(["Divisie 1"]);
  const update = useApp((s) => s.updateTournament);

  const finish = () => {
    const id = createTournament(
      name.trim(),
      days.filter(Boolean),
      locations.map((l) => l.trim()).filter(Boolean),
      divisions.map((d) => d.trim()).filter(Boolean),
      esport
    );
    if (individual) update(id, (x) => x.divisions.forEach((d) => (d.individualMode = true)));
    // land op Deelnemers: de logische volgende stap na de wizard
    nav(`/t/${id}/deelnemers`);
  };

  return (
    <div className="min-h-screen">
      <header className="accent-header flex items-center justify-between px-6 py-4 text-white">
        <div className="flex items-center gap-2 text-xl font-bold">🏆 Toernooitje</div>
        <span className="text-sm font-semibold uppercase">Nederlands</span>
      </header>

      <div className="mx-auto mt-10 max-w-lg px-4">
        <div className="card overflow-hidden">
          <div className="h-1.5 bg-indigo-200">
            <div
              className="h-full transition-all"
              style={{ width: `${((step + 1) / 3) * 100}%`, background: "var(--accent)" }}
            />
          </div>
          <div className="p-8">
            {step === 0 && (
              <>
                <h1 className="text-2xl font-bold">Nieuw toernooi</h1>
                <p className="mt-1 text-sm text-slate-600">Alle gegevens kun je later nog aanpassen.</p>
                <div className="mt-6 space-y-5">
                  <input
                    className="input"
                    placeholder="Toernooinaam"
                    value={name}
                    autoFocus
                    onChange={(e) => setName(e.target.value)}
                  />
                  {days.map((d, i) => (
                    <div key={i}>
                      <label className="label">Datum{days.length > 1 ? ` dag ${i + 1}` : ""}</label>
                      <input
                        type="date"
                        className="input"
                        value={d}
                        onChange={(e) => setDays(days.map((x, j) => (j === i ? e.target.value : x)))}
                      />
                    </div>
                  ))}
                  <button className="btn-outline" onClick={() => setDays([...days, days[days.length - 1]])}>
                    Nog een dag toevoegen
                  </button>
                </div>
                <div className="mt-8 flex justify-end gap-3">
                  <button className="btn-ghost" onClick={() => nav("/")}>Annuleren</button>
                  <button className="btn-primary" disabled={!name.trim()} onClick={() => setStep(1)}>
                    Volgende
                  </button>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <h1 className="text-2xl font-bold">Voer de locatie in</h1>
                <p className="mt-1 text-sm text-slate-600">
                  Vul hier de naam van de vereniging, sportpark of hal in. Later kan je de velden toevoegen.
                </p>
                <div className="mt-6 space-y-4">
                  {locations.map((l, i) => (
                    <input
                      key={i}
                      className="input"
                      placeholder="Locatie"
                      value={l}
                      onChange={(e) => setLocations(locations.map((x, j) => (j === i ? e.target.value : x)))}
                    />
                  ))}
                  <button className="btn-outline" onClick={() => setLocations([...locations, ""])}>
                    Nog een locatie toevoegen
                  </button>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={esport} onChange={(e) => setEsport(e.target.checked)} />
                    Dit is een online (eSport) toernooi
                  </label>
                </div>
                <div className="mt-8 flex justify-end gap-3">
                  <button className="btn-ghost" onClick={() => setStep(0)}>Terug</button>
                  <button className="btn-primary" onClick={() => setStep(2)}>Volgende</button>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <h1 className="text-2xl font-bold">Stel de doelgroep in</h1>
                <p className="mt-1 text-sm text-slate-600">
                  Je kunt je toernooi opdelen in meerdere divisies als er verschillende leeftijdsgroepen
                  of niveaus meedoen.
                </p>
                <div className="mt-6 space-y-4">
                  {divisions.map((d, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        className="input"
                        placeholder="Divisie"
                        value={d}
                        onChange={(e) => setDivisions(divisions.map((x, j) => (j === i ? e.target.value : x)))}
                      />
                      {divisions.length > 1 && (
                        <button className="btn-ghost" onClick={() => setDivisions(divisions.filter((_, j) => j !== i))}>
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    className="btn-outline"
                    onClick={() => setDivisions([...divisions, `Divisie ${divisions.length + 1}`])}
                  >
                    Nog een divisie toevoegen
                  </button>
                  <label className="flex items-center gap-2 pt-2 text-sm">
                    <input
                      type="checkbox"
                      checked={individual}
                      onChange={(e) => setIndividual(e.target.checked)}
                    />
                    <span>
                      Individueel toernooi — geen vaste teams maar <b>spelers</b> die elke ronde
                      nieuwe teams loten (bijv. 4x4)
                    </span>
                  </label>
                </div>
                <div className="mt-8 flex justify-end gap-3">
                  <button className="btn-ghost" onClick={() => setStep(1)}>Terug</button>
                  <button className="btn-primary" onClick={finish}>Aanmaken</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
