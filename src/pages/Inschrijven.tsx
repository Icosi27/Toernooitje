import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useApp, useTournament } from "../store";
import type { Registration, Tournament } from "../types";
import { clientFromParams, useCloudTournament } from "../logic/cloud";
import { submitRegistration } from "../logic/cloud";
import { uid } from "../logic/id";
import { DonateButton } from "../components/monetization";

/**
 * Publieke inschrijfpagina: teams melden zich aan; de organisator ziet ze
 * binnenkomen op de Deelnemers-pagina en accepteert of wijst af.
 * Werkt lokaal (zelfde apparaat) en online (via Supabase, ?s=&a= in de link).
 */
export default function Inschrijven() {
  const { id } = useParams();
  const local = useTournament(id);
  const [params] = useSearchParams();
  const cloud = useCloudTournament(local ? undefined : id, params.get("s"), params.get("a"));
  const t = local ?? cloud.t;

  if (!local && cloud.loading)
    return <div className="p-10 text-center text-slate-500">Laden…</div>;
  if (!t)
    return (
      <div className="p-10 text-center">
        {cloud.error ?? "Toernooi niet gevonden."}{" "}
        <Link to="/" className="underline">Naar home</Link>
      </div>
    );

  return <Form t={t} isLocal={!!local} />;
}

function Form({ t, isLocal }: { t: Tournament; isLocal: boolean }) {
  const update = useApp((s) => s.updateTournament);
  const [teamName, setTeamName] = useState("");
  const [divisionId, setDivisionId] = useState(t.divisions[0]?.id ?? "");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // bij een individuele divisie schrijf je een spéler in, geen team
  const chosenDiv = t.divisions.find((d) => d.id === divisionId) ?? t.divisions[0];
  const indiv = !!chosenDiv?.individualMode;

  const submit = async () => {
    setBusy(true);
    setError(null);
    const reg: Registration = {
      id: uid(),
      teamName: teamName.trim(),
      divisionId: divisionId || undefined,
      contact: contact.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      note: note.trim() || undefined,
      status: "nieuw",
      createdAt: new Date().toISOString(),
    };
    try {
      if (isLocal) {
        update(t.id, (x) => {
          (x.registrations ??= []).push(reg);
        });
      } else {
        const sb = clientFromParams(null, null);
        if (!sb) throw new Error("Geen verbinding met de server.");
        await submitRegistration(sb, t.id, reg);
      }
      setDone(true);
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ ["--accent" as string]: t.presentation.accentColor }}>
      <header className="px-6 py-6 text-white" style={{ background: "var(--accent)" }}>
        <div className="mx-auto flex max-w-lg items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">{t.name}</h1>
            <p className="text-sm opacity-80">
              Inschrijven · {t.days.join(" · ")}
              {t.locations.length > 0 && ` · ${t.locations.join(", ")}`}
            </p>
          </div>
          <DonateButton small />
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-8">
        {done ? (
          <div className="card p-8 text-center">
            <div className="mb-3 text-5xl">✅</div>
            <h2 className="text-xl font-bold">Inschrijving verstuurd!</h2>
            <p className="mt-2 text-sm text-slate-600">
              De organisatie bekijkt de aanmelding van <b>{teamName}</b>
              {email && (
                <>
                  {" "}en gebruikt <b>{email}</b> om contact op te nemen
                </>
              )}
              .
            </p>
            <button
              className="btn-outline mt-6"
              onClick={() => {
                setDone(false);
                setTeamName("");
                setNote("");
              }}
            >
              {indiv ? "Nog een speler inschrijven" : "Nog een team inschrijven"}
            </button>
          </div>
        ) : !t.registrationOpen ? (
          <div className="card p-8 text-center">
            <div className="mb-3 text-5xl">🔒</div>
            <h2 className="text-xl font-bold">De inschrijving is gesloten</h2>
            <p className="mt-2 text-sm text-slate-600">
              Neem contact op met de organisatie voor meer informatie.
            </p>
          </div>
        ) : (
          <div className="card p-6">
            <h2 className="text-lg font-bold">{indiv ? "Schrijf je in als speler" : "Schrijf je team in"}</h2>
            {t.registrationInfo && (
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{t.registrationInfo}</p>
            )}
            <div className="mt-5 space-y-4">
              <div>
                <label className="label">{indiv ? "Naam speler *" : "Teamnaam *"}</label>
                <input className="input" value={teamName} onChange={(e) => setTeamName(e.target.value)} autoFocus />
              </div>
              {t.divisions.length > 1 && (
                <div>
                  <label className="label">Divisie</label>
                  <select className="input" value={divisionId} onChange={(e) => setDivisionId(e.target.value)}>
                    {t.divisions.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {!indiv && (
                <div>
                  <label className="label">Contactpersoon</label>
                  <input className="input" value={contact} onChange={(e) => setContact(e.target.value)} />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">E-mail</label>
                  <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <label className="label">Telefoon</label>
                  <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label">Opmerkingen</label>
                <textarea
                  className="input h-20 resize-none rounded border border-slate-200 p-2"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button className="btn-primary w-full" disabled={!teamName.trim() || busy} onClick={submit}>
                {busy ? "Versturen…" : "Inschrijven"}
              </button>
            </div>
          </div>
        )}

        <footer className="mt-8 flex flex-col items-center gap-2 text-center text-xs text-slate-400">
          <span>Gemaakt met <b>Toernooitje</b> — gratis toernooisoftware.</span>
        </footer>
      </main>
    </div>
  );
}
