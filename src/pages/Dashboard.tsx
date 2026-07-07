import { Link, NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import { useTournament } from "../store";
import { DonateButton } from "../components/monetization";

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
