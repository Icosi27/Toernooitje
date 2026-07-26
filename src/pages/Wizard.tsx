import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../store";
import { uid } from "../logic/id";

/** 4-staps wizard zoals Tournify: naam+dagen, locaties, divisies, speelschema-basis. */
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
  const [startTime, setStartTime] = useState("09:00");
  const [matchDuration, setMatchDuration] = useState(15);
  const [breakBetween, setBreakBetween] = useState(5);
  const [fieldCount, setFieldCount] = useState(2);
  const update = useApp((s) => s.updateTournament);

  const finish = () => {
    const id = createTournament(
      name.trim(),
      days.filter(Boolean),
      locations.map((l) => l.trim()).filter(Boolean),
      divisions.map((d) => d.trim()).filter(Boolean),
      esport
    );
    update(id, (x) => {
      if (individual) x.divisions.forEach((d) => (d.individualMode = true));
      x.startTime = startTime;
      x.matchDuration = Math.max(1, matchDuration);
      x.breakBetween = Math.max(0, breakBetween);
      for (let i = 0; i < Math.max(1, fieldCount); i++)
        x.fields.push({ id: uid(), name: `Veld ${i + 1}` });
    });
    // land op Deelnemers: de logische volgende stap na de wizard
    nav(`/t/${id}/deelnemers`);
  };

  // capaciteitsindicatie: hoeveel wedstrijden passen er per uur op deze opzet?
  const perHour =
    matchDuration > 0
      ? Math.floor((60 / (matchDuration + Math.max(0, breakBetween))) * Math.max(1, fieldCount))
      : 0;

  return (
    <div className="min-h-screen">
      <header className="stadium flex items-center justify-between px-6 py-4 text-white">
        <div className="flex items-center gap-2 text-xl font-bold">🏆 Toernooitje</div>
      </header>

      <div className="mx-auto mt-10 max-w-lg px-4">
        <div className="card overflow-hidden">
          <div className="h-1.5" style={{ background: "var(--accent-soft)" }}>
            <div
              className="h-full transition-all"
              style={{ width: `${((step + 1) / 4) * 100}%`, background: "var(--accent)" }}
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
                  <button className="btn-ghost" onClick={() => nav("/app")}>Annuleren</button>
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
                <h1 className="text-2xl font-bold">Deel je toernooi op in divisies</h1>
                <p className="mt-1 text-sm text-slate-600">
                  Spelen er verschillende leeftijden of niveaus mee? Maak voor elk een eigen divisie
                  met een eigen programma en stand. Eén niveau? Ga gewoon door.
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
                  <button className="btn-primary" onClick={() => setStep(3)}>Volgende</button>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <h1 className="text-2xl font-bold">Hoe ziet de speeldag eruit?</h1>
                <p className="mt-1 text-sm text-slate-600">
                  Hiermee rekent het schema straks vanzelf — en alles is later nog aan te passen.
                </p>
                <div className="mt-6 space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Starttijd</label>
                      <input
                        type="time"
                        className="input"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value || "09:00")}
                      />
                    </div>
                    <div>
                      <label className="label">Aantal velden/banen</label>
                      <input
                        type="number"
                        min={1}
                        max={24}
                        className="input"
                        value={fieldCount}
                        onChange={(e) => setFieldCount(+e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="label">Wedstrijdduur (minuten)</label>
                      <input
                        type="number"
                        min={1}
                        className="input"
                        value={matchDuration}
                        onChange={(e) => setMatchDuration(+e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="label">Rust tussen wedstrijden (minuten)</label>
                      <input
                        type="number"
                        min={0}
                        className="input"
                        value={breakBetween}
                        onChange={(e) => setBreakBetween(+e.target.value)}
                      />
                    </div>
                  </div>
                  {perHour > 0 && (
                    <p className="rounded bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      📐 Met deze opzet passen er ongeveer <b>{perHour} wedstrijden per uur</b>
                      {` (${Math.max(1, fieldCount)} ${fieldCount === 1 ? "veld" : "velden"} × ${matchDuration}+${Math.max(0, breakBetween)} min).`}
                    </p>
                  )}
                </div>
                <div className="mt-8 flex justify-end gap-3">
                  <button className="btn-ghost" onClick={() => setStep(2)}>Terug</button>
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
