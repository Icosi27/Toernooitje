import { Link, useNavigate } from "react-router-dom";
import { useApp } from "../store";
import { DonateButton } from "../components/monetization";

export default function Home() {
  const { tournaments, deleteTournament } = useApp();
  const nav = useNavigate();

  return (
    <div className="min-h-screen">
      <header className="accent-header flex items-center justify-between px-6 py-4 text-white">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold">🏆 Toernooitje</Link>
        <div className="flex items-center gap-4">
          <DonateButton small />
          <Link to="/" className="text-sm underline opacity-80">homepage</Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Mijn toernooien</h1>
          <p className="mt-2 text-slate-600">
            Je toernooien staan veilig op dit apparaat. Accounts om overal in te loggen komen eraan.
          </p>
          <button className="btn-primary mt-6" onClick={() => nav("/nieuw")}>
            + Nieuw toernooi
          </button>
        </div>

        {tournaments.length > 0 && (
          <div className="card divide-y divide-slate-100">
            {tournaments.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-4">
                <Link to={`/t/${t.id}`} className="flex-1">
                  <div className="font-semibold">{t.name}</div>
                  <div className="text-xs text-slate-500">
                    {t.days.join(", ")} · {t.locations.join(", ") || "geen locatie"} ·{" "}
                    {t.divisions.length} divisie{t.divisions.length !== 1 ? "s" : ""}
                  </div>
                </Link>
                <div className="flex gap-2">
                  <Link className="btn-outline" to={`/live/${t.id}`}>
                    Presentatie
                  </Link>
                  <button
                    className="btn-ghost text-red-500"
                    onClick={() => {
                      if (confirm(`Toernooi "${t.name}" verwijderen?`)) deleteTournament(t.id);
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="mt-10 text-center text-xs text-slate-400">
          Toernooitje is gratis en blijft draaien dankzij advertenties en giften. Organisatoren
          kunnen de reclame afkopen en eigen sponsoren tonen.{" "}
          <Link to="/voorwaarden" className="underline">Voorwaarden</Link> ·{" "}
          <Link to="/privacy" className="underline">Privacy</Link>
        </p>
      </main>
    </div>
  );
}
