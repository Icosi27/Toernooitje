import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import { useApp, useTournament } from "../store";
import type { Tournament } from "../types";
import {
  applyScores,
  getClient,
  listRegistrations,
  publishTournament,
  subscribeScores,
  type ScoreRow,
} from "../logic/cloud";
import { saveTournamentToAccount } from "../logic/account";
import { useSession } from "../logic/auth";
import { DonateButton } from "../components/monetization";

/**
 * Houdt een online gezet toernooi synchroon: elke lokale wijziging wordt
 * (met een korte vertraging) gepubliceerd, en uitslagen die scheidsrechters
 * op hun eigen telefoon invullen stromen live het dashboard binnen.
 */
function useCloudSync(t: Tournament | undefined): { error: boolean; lastSync: string | null; retry: () => void } {
  const update = useApp((s) => s.updateTournament);
  const [syncError, setSyncError] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
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
        .then(() => {
          setSyncError(false);
          setLastSync(new Date().toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" }));
        })
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
        .select("match_id, score_a, score_b, pens_a, pens_b, live")
        .eq("tournament_id", id);
      if (!data || data.length === 0) return;
      update(id, (x) => applyScores(x, data as ScoreRow[]));
    };
    load();
    return subscribeScores(sb, id, load);
  }, [t?.id, online]);

  // online inschrijvingen binnenhalen (elke 30s; nieuwe komen erbij,
  // lokale beslissingen blijven staan)
  useEffect(() => {
    if (!online || !t?.cloud) return;
    const sb = getClient();
    if (!sb) return;
    const id = t.id;
    const key = t.cloud.writeKey;
    const load = async () => {
      try {
        const rows = await listRegistrations(sb, id, key);
        if (rows.length === 0) return;
        update(id, (x) => {
          const seen = new Set((x.registrations ?? []).map((r) => r.id));
          for (const row of rows) {
            if (!seen.has(row.id)) (x.registrations ??= []).push(row);
          }
        });
      } catch {
        // sleutel/verbinding fout: stil laten, volgende poging over 30s
      }
    };
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, [t?.id, online]);

  const retry = () => {
    if (!t) return;
    publishTournament(t)
      .then(() => {
        setSyncError(false);
        setLastSync(new Date().toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" }));
      })
      .catch(() => setSyncError(true));
  };

  return { error: syncError, lastSync, retry };
}

// volgorde = de natuurlijke route: opzetten -> deelnemers -> indeling ->
// schema -> uitslagen -> presenteren
const NAV = [
  { to: "", icon: "⚙️", label: "Algemeen", end: true },
  { to: "deelnemers", icon: "👕", label: "Deelnemers" },
  { to: "indeling", icon: "🗂️", label: "Indeling" },
  { to: "schema", icon: "📅", label: "Schema" },
  { to: "resultaten", icon: "🔢", label: "Resultaten" },
  { to: "presentatie", icon: "🖥️", label: "Presentatie" },
];

/** Ingelogd? Dan gaat elke wijziging (debounced) als back-up naar het account. */
function useAccountBackup(t: Tournament | undefined) {
  const session = useSession();
  const json = t ? JSON.stringify(t) : "";
  useEffect(() => {
    if (!t || !session) return;
    const h = setTimeout(() => {
      saveTournamentToAccount(t, session.user.id).catch(() => {});
    }, 3000);
    return () => clearTimeout(h);
  }, [json, session?.user.id]);
}

export default function Dashboard() {
  const { id } = useParams();
  const t = useTournament(id);
  const nav = useNavigate();
  const sync = useCloudSync(t);
  useAccountBackup(t);

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
      <header className="accent-header sticky top-0 z-40 flex items-center justify-between px-4 py-3 text-white">
        <button className="flex items-center gap-3 text-lg font-bold cursor-pointer" onClick={() => nav("/app")}>
          <span>←</span> {t.name}
        </button>
        <div className="flex items-center gap-3">
          {t.cloud?.online &&
            (sync.error ? (
              <button
                onClick={sync.retry}
                className="cursor-pointer rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-amber-950"
                title="Publiceren mislukt — klik om opnieuw te proberen"
              >
                ⚠ Niet gesynchroniseerd — opnieuw
              </button>
            ) : (
              <span
                className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold"
                title="Wijzigingen worden automatisch gepubliceerd"
              >
                ● Live{sync.lastSync ? ` · ${sync.lastSync}` : ""}
              </span>
            ))}
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
