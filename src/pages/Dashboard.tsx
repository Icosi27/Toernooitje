import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import { useApp, useTournament } from "../store";
import type { Tournament } from "../types";
import { applyScores, getClient, publishTournament, subscribeScores, type ScoreRow } from "../logic/cloud";
import { DonateButton } from "../components/monetization";

/**
 * Houdt een online gezet toernooi synchroon: elke lokale wijziging wordt
 * (met een korte vertraging) gepubliceerd, en uitslagen die scheidsrechters
 * op hun eigen telefoon invullen stromen live het dashboard binnen.
 */
function useCloudSync(t: Tournament | undefined) {
  const update = useApp((s) => s.updateTournament);
  const [syncError, setSyncError] = useState(false);
  const online = !!t?.cloud?.online;
  const tJson = useMemo(
    () => (online ? JSON.stringify({ ...t, cloud: undefined }) : ""),
    [t, online]
  );
  const skipFirst = useRef(true);

  // lokale wijzigingen publiceren (debounced)
  useEffect(() => {
    if (!online || !t) return;
    if (skipFirst.current) {
      // eerste render is geen wijziging
      skipFirst.current = false;
      return;
    }
    const h = setTimeout(() => {
      publishTournament(t)
        .then(() => setSyncError(false))
        .catch(() => setSyncError(true));
    }, 1500);
    return () => clearTimeout(h);
  }, [tJson, online]);

  // uitslagen van buitenaf binnenhalen
  useEffect(() => {
    if (!online || !t) return;
    const sb = getClient();
    if (!sb) return;
    const id = t.id;
    const load = async () => {
      const { data } = await sb
        .from("scores")
        .select("match_id, score_a, score_b, pens_a, pens_b")
        .eq("tournament_id", id);
      if (!data || data.length === 0) return;
      update(id, (x) => applyScores(x, data as ScoreRow[]));
    };
    load();
    return subscribeScores(sb, id, load);
  }, [t?.id, online]);

  return syncError;
}

const NAV = [
  { to: "", icon: "⚙️", label: "Algemeen", end: true },
  { to: "deelnemers", icon: "👕", label: "Deelnemers" },
  { to: "indeling", icon: "🗂️", label: "Indeling" },
  { to: "schema", icon: "📅", label: "Schema" },
  { to: "presentatie", icon: "🖥️", label: "Presentatie" },
  { to: "resultaten", icon: "🔢", label: "Resultaten" },
];

export default function Dashboard() {
  const { id } = useParams();
  const t = useTournament(id);
  const nav = useNavigate();
  useCloudSync(t);

  if (!t) {
    return (
      <div className="p-10 text-center">
        <p>Toernooi niet gevonden.</p>
        <Link to="/" className="btn-primary mt-4">Naar home</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ ["--accent" as string]: t.presentation.accentColor }}>
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 text-white"
        style={{ background: "var(--accent)" }}
      >
        <button className="flex items-center gap-3 text-lg font-bold cursor-pointer" onClick={() => nav("/")}>
          <span>←</span> {t.name}
        </button>
        <div className="flex items-center gap-3">
          <DonateButton small />
          <Link to={`/live/${t.id}`} className="btn text-white text-sm hover:bg-white/10">
            🖥️ Presentatie
          </Link>
        </div>
      </header>

      <div className="flex">
        <nav className="sticky top-14 h-[calc(100vh-3.5rem)] w-24 shrink-0 border-r border-slate-200 bg-white py-4">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-3 text-[11px] ${
                  isActive ? "font-semibold" : "text-slate-500 hover:text-slate-800"
                }`
              }
              style={({ isActive }) => (isActive ? { color: "var(--accent)" } : undefined)}
            >
              <span className="text-xl">{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <main className="min-w-0 flex-1 px-6 py-6">
          <Outlet context={t} />
        </main>
      </div>
    </div>
  );
}
