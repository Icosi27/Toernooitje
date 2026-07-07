import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useTournament } from "../store";
import type { Division, Tournament } from "../types";
import { pouleStandings } from "../logic/standings";
import { individualStandings } from "../logic/individual";
import { slotLabel } from "../logic/resolve";
import { scheduledMatches } from "../logic/schedule";
import { decodeShare } from "../logic/share";
import { useCloudTournament } from "../logic/cloud";
import { AdBlock, DonateButton } from "../components/monetization";

type Page = "toernooi" | "standen" | "schema";

/** Publieke toernooiwebsite + diavoorstelling (op het apparaat van de organisator). */
export default function Live() {
  const { id } = useParams();
  const t = useTournament(id);
  return <LiveInner t={t} />;
}

/** Live meekijken op elk apparaat: haalt het toernooi online op en werkt live bij. */
export function KijkLive() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { t, loading, error } = useCloudTournament(id, params.get("s"), params.get("a"));
  if (loading) return <div className="p-10 text-center text-slate-500">Laden…</div>;
  if (error || !t)
    return (
      <div className="p-10 text-center">
        {error ?? "Toernooi niet gevonden."} <Link to="/" className="underline">Naar home</Link>
      </div>
    );
  return <LiveInner t={t} shared live />;
}

/** Gedeelde weergave: het toernooi zit gecomprimeerd in de link zelf (momentopname). */
export function Bekijk() {
  const [params] = useSearchParams();
  const t = useMemo(() => {
    const d = params.get("d");
    return d ? (decodeShare(d) ?? undefined) : undefined;
  }, [params]);
  return <LiveInner t={t} shared />;
}

function LiveInner({
  t,
  shared = false,
  live = false,
}: {
  t: Tournament | undefined;
  shared?: boolean;
  live?: boolean;
}) {
  const [page, setPage] = useState<Page>("standen");
  const [slideshow, setSlideshow] = useState(false);

  const pages = useMemo(() => {
    if (!t) return [] as Page[];
    const p: Page[] = [];
    if (t.presentation.pages.toernooi) p.push("toernooi");
    if (t.presentation.pages.standen) p.push("standen");
    if (t.presentation.pages.schema) p.push("schema");
    return p.length ? p : (["standen"] as Page[]);
  }, [t]);

  useEffect(() => {
    if (!slideshow || !t) return;
    const iv = setInterval(() => {
      setPage((cur) => pages[(pages.indexOf(cur) + 1) % pages.length]);
    }, t.presentation.slideSeconds * 1000);
    return () => clearInterval(iv);
  }, [slideshow, pages, t]);

  if (!t)
    return (
      <div className="p-10 text-center">
        {shared ? "Ongeldige of verlopen deellink." : "Toernooi niet gevonden."}{" "}
        <Link to="/" className="underline">Naar home</Link>
      </div>
    );

  const labels: Record<Page, string> = { toernooi: "Toernooi", standen: "Standen", schema: "Schema" };

  return (
    <div className="min-h-screen" style={{ ["--accent" as string]: t.presentation.accentColor }}>
      <header
        className="relative px-6 py-8 text-white"
        style={{
          background: t.presentation.background
            ? `linear-gradient(rgba(0,0,0,.55), rgba(0,0,0,.55)), url(${t.presentation.background}) center/cover`
            : "var(--accent)",
        }}
      >
        <div className="mx-auto flex max-w-4xl items-center gap-4">
          {t.presentation.logo && <img src={t.presentation.logo} alt="logo" className="h-14" />}
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{t.name}</h1>
            <p className="text-sm opacity-80">
              {t.days.join(" · ")} {t.locations.length > 0 && `· ${t.locations.join(", ")}`}
            </p>
          </div>
          <DonateButton />
          {!shared && <Link to={`/t/${t.id}`} className="text-xs underline opacity-70">beheer</Link>}
        </div>
        <nav className="mx-auto mt-6 flex max-w-4xl gap-2">
          {pages.map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-semibold ${
                page === p ? "bg-white" : "bg-white/20 text-white hover:bg-white/30"
              }`}
              style={page === p ? { color: t.presentation.accentColor } : undefined}
            >
              {labels[p]}
            </button>
          ))}
          <button
            onClick={() => setSlideshow(!slideshow)}
            className={`ml-auto cursor-pointer rounded-full px-4 py-1.5 text-sm ${
              slideshow ? "bg-white/90 text-slate-900" : "bg-white/20 hover:bg-white/30"
            }`}
            title="Diavoorstelling: wissel automatisch tussen pagina's"
          >
            {slideshow ? "⏸ Dia's stoppen" : "▶ Diavoorstelling"}
          </button>
        </nav>
      </header>

      <main className="mx-auto max-w-4xl space-y-8 px-4 py-8">
        {shared && !live && (
          <p className="rounded bg-slate-100 px-3 py-2 text-center text-xs text-slate-500">
            Gedeelde momentopname — vraag de organisator om een nieuwe link voor de laatste stand.
          </p>
        )}
        {live && (
          <p className="rounded bg-green-50 px-3 py-2 text-center text-xs text-green-700">
            ● Live — standen en uitslagen worden automatisch bijgewerkt.
          </p>
        )}
        <AdBlock t={t} />

        {page === "toernooi" && <ToernooiInfo t={t} />}
        {page === "standen" && t.divisions.map((d) => <Standen key={d.id} t={t} d={d} />)}
        {page === "schema" && <SchemaView t={t} />}

        <AdBlock t={t} slot={1} />

        <footer className="flex flex-col items-center gap-3 border-t border-slate-200 py-6 text-center text-xs text-slate-400">
          <div>
            Gemaakt met <b>Toernooitje</b> — gratis toernooisoftware. Houd de app levend:
          </div>
          <DonateButton small />
        </footer>
      </main>
    </div>
  );
}

function ToernooiInfo({ t }: { t: Tournament }) {
  return (
    <div className="card p-6">
      <h2 className="mb-3 text-lg font-bold">Informatie</h2>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <dt className="text-slate-500">Sport</dt>
        <dd>{t.sport}</dd>
        <dt className="text-slate-500">Datum</dt>
        <dd>{t.days.join(", ")}</dd>
        <dt className="text-slate-500">Locatie</dt>
        <dd>{t.locations.join(", ") || "—"}</dd>
        <dt className="text-slate-500">Divisies</dt>
        <dd>{t.divisions.map((d) => d.name).join(", ")}</dd>
        {t.gender && (
          <>
            <dt className="text-slate-500">Geslacht</dt>
            <dd>{t.gender}</dd>
          </>
        )}
        {t.level && (
          <>
            <dt className="text-slate-500">Niveau</dt>
            <dd>{"⭐".repeat(t.level)}</dd>
          </>
        )}
      </dl>
    </div>
  );
}

function Standen({ t, d }: { t: Tournament; d: Division }) {
  const teamName = (id: string) => d.teams.find((tm) => tm.id === id)?.name ?? "?";
  if (d.stages.length === 0) return null;

  return (
    <div>
      {t.divisions.length > 1 && <h2 className="mb-3 text-xl font-bold">{d.name}</h2>}
      <div className="grid gap-4 md:grid-cols-2">
        {d.stages.map((s) => {
          if (s.type === "poules")
            return s.poules.map((p) => (
              <div key={p.id} className="card p-4">
                <div className="mb-2 font-semibold">{p.name}</div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase text-slate-400">
                      <th className="py-1">#</th>
                      <th>Team</th>
                      <th className="text-center">G</th>
                      <th className="text-center">DS</th>
                      <th className="text-center">P</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pouleStandings(p, t.scoring).map((r, i) => (
                      <tr key={r.teamId} className="border-t border-slate-100">
                        <td className="py-1 text-slate-400">{i + 1}</td>
                        <td className="font-medium">{teamName(r.teamId)}</td>
                        <td className="text-center">{r.played}</td>
                        <td className="text-center">{r.goalDiff > 0 ? `+${r.goalDiff}` : r.goalDiff}</td>
                        <td className="text-center font-bold">{r.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ));
          if (s.type === "bracket")
            return (
              <div key={s.id} className="card p-4 md:col-span-2">
                <div className="mb-2 font-semibold">{s.name}</div>
                <div className="flex gap-6 overflow-x-auto pb-2">
                  {s.rounds.map((r, ri) => (
                    <div key={ri} className="min-w-44">
                      <div className="mb-2 text-xs font-semibold uppercase text-slate-500">{r.name}</div>
                      <div className="space-y-3">
                        {r.matches.map((m) => (
                          <div key={m.id} className="rounded border border-slate-200 p-2 text-sm">
                            <div className="flex justify-between gap-2">
                              <span className="truncate">{slotLabel(m.a, d, t.scoring)}</span>
                              <b>{m.scoreA ?? ""}</b>
                            </div>
                            <div className="flex justify-between gap-2 border-t border-slate-100 pt-1">
                              <span className="truncate">{slotLabel(m.b, d, t.scoring)}</span>
                              <b>{m.scoreB ?? ""}</b>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          return (
            <div key={s.id} className="card p-4">
              <div className="mb-2 font-semibold">Individueel klassement</div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-slate-400">
                    <th className="py-1">#</th>
                    <th>Speler</th>
                    <th className="text-center">G</th>
                    <th className="text-center">P</th>
                  </tr>
                </thead>
                <tbody>
                  {individualStandings(s, d.players, t.scoring.win, t.scoring.draw, t.scoring.loss).map((r, i) => (
                    <tr key={r.playerId} className="border-t border-slate-100">
                      <td className="py-1 text-slate-400">{i + 1}</td>
                      <td className="font-medium">{d.players.find((p) => p.id === r.playerId)?.name ?? "?"}</td>
                      <td className="text-center">{r.played}</td>
                      <td className="text-center font-bold">{r.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SchemaView({ t }: { t: Tournament }) {
  const rows = scheduledMatches(t);
  const fieldName = (id?: string) => t.fields.find((f) => f.id === id)?.name ?? "—";
  if (rows.length === 0) return <p className="text-center text-slate-500">Nog geen speelschema.</p>;

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
            <th className="px-3 py-2">Tijd</th>
            <th className="px-3 py-2">Veld</th>
            <th className="px-3 py-2">Wedstrijd</th>
            <th className="px-3 py-2 text-center">Uitslag</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ match: m, division: d }) => (
            <tr key={m.id} className="border-b border-slate-100">
              <td className="px-3 py-2">{m.start ?? "—"}</td>
              <td className="px-3 py-2">{fieldName(m.fieldId)}</td>
              <td className="px-3 py-2">
                {slotLabel(m.a, d, t.scoring)} — {slotLabel(m.b, d, t.scoring)}
                {m.label && <span className="ml-2 text-xs text-slate-400">{m.label}</span>}
              </td>
              <td className="px-3 py-2 text-center font-bold">
                {m.scoreA !== undefined && m.scoreB !== undefined ? `${m.scoreA} – ${m.scoreB}` : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
