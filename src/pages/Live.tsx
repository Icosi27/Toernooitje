import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useTournament } from "../store";
import type { Division, Match, Tournament } from "../types";
import { isPlayed, pouleStandings } from "../logic/standings";
import { individualStandings } from "../logic/individual";
import { qualifyingRanks, resolveSlot, slotLabel, winnerOf } from "../logic/resolve";
import { scheduledMatches } from "../logic/schedule";
import { copyText, decodeShare } from "../logic/share";
import { useCloudTournament } from "../logic/cloud";
import { AdBlock, DonateButton } from "../components/monetization";
import { TeamBadge } from "../components/TeamBadge";
import { Confetti, Trophy } from "../components/decor";
import { VenueMapView } from "../components/VenueMap";

type Page = "toernooi" | "standen" | "schema" | "plattegrond";

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

/** "HH:MM" van dit moment, om te zien welke wedstrijden nú bezig zijn. */
function nowHHMM(): string {
  return new Date().toTimeString().slice(0, 5);
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
  const [params] = useSearchParams();
  const [page, setPage] = useState<Page>("standen");
  const [slideshow, setSlideshow] = useState(false);
  const [myTeam, setMyTeam] = useState<string>("");
  const [copied, setCopied] = useState(false);
  // veld dat vanuit het schema is aangetikt (pin op de plattegrond)
  const [pinnedField, setPinnedField] = useState<string | null>(null);

  const goToPage = (p: Page) => {
    if (p !== "plattegrond") setPinnedField(null);
    setPage(p);
  };
  const showFieldOnMap = (fieldId: string) => {
    setPinnedField(fieldId);
    setPage("plattegrond");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // mijn team: uit de link (?team=) of eerder gekozen op dit apparaat
  useEffect(() => {
    if (!t) return;
    const fromUrl = params.get("team");
    const fromStorage = localStorage.getItem(`toernooitje-myteam-${t.id}`);
    const candidate = fromUrl || fromStorage || "";
    if (candidate && t.divisions.some((d) => d.teams.some((tm) => tm.id === candidate)))
      setMyTeam(candidate);
  }, [t?.id]);

  const chooseTeam = (id: string) => {
    setMyTeam(id);
    if (t) localStorage.setItem(`toernooitje-myteam-${t.id}`, id);
  };

  const pages = useMemo(() => {
    if (!t) return [] as Page[];
    const p: Page[] = [];
    if (t.presentation.pages.toernooi) p.push("toernooi");
    if (t.presentation.pages.standen) p.push("standen");
    if (t.presentation.pages.schema) p.push("schema");
    if ((t.venueMap?.blocks?.length ?? 0) > 0) p.push("plattegrond");
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

  const labels: Record<Page, string> = {
    toernooi: "Toernooi",
    standen: "Standen",
    schema: "Schema",
    plattegrond: "Plattegrond",
  };
  const allTeams = t.divisions.flatMap((d) => d.teams.map((tm) => ({ team: tm, division: d })));

  const shareTeamLink = async () => {
    const [path, q] = window.location.hash.slice(1).split("?");
    const sp = new URLSearchParams(q ?? "");
    if (myTeam) sp.set("team", myTeam);
    const qs = sp.toString();
    const ok = await copyText(`${window.location.origin}${window.location.pathname}#${path}${qs ? `?${qs}` : ""}`);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className="min-h-screen"
      data-pres={slideshow ? "true" : undefined}
      style={{ ["--accent" as string]: t.presentation.accentColor }}
    >
      <header
        className={`relative overflow-hidden px-6 py-10 text-white ${t.presentation.background ? "" : "stadium"}`}
        style={
          t.presentation.background
            ? {
                background: `linear-gradient(rgba(0,0,0,.55), rgba(0,0,0,.55)), url(${t.presentation.background}) center/cover`,
              }
            : undefined
        }
      >
        {slideshow && <div className="beam left-[10%]" style={{ animationDelay: "-3s" }} />}
        <div className={`mx-auto flex items-center gap-4 ${slideshow ? "max-w-6xl" : "max-w-4xl"}`}>
          {t.presentation.logo && <img src={t.presentation.logo} alt="logo" className="h-14" />}
          <div className="flex-1">
            <h1 className={`font-black tracking-tight ${slideshow ? "text-4xl" : "text-2xl"}`}>{t.name}</h1>
            <p className="text-sm opacity-80">
              {t.days.join(" · ")} {t.locations.length > 0 && `· ${t.locations.join(", ")}`}
            </p>
          </div>
          {!slideshow && <DonateButton />}
          {!shared && !slideshow && (
            <Link to={`/t/${t.id}`} className="text-xs underline opacity-70">beheer</Link>
          )}
        </div>
      </header>

      <nav className="accent-header sticky top-0 z-30 px-4 py-2">
        <div className={`mx-auto flex flex-wrap items-center gap-2 ${slideshow ? "max-w-6xl" : "max-w-4xl"}`}>
          {pages.map((p) => (
            <button
              key={p}
              onClick={() => goToPage(p)}
              className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-semibold ${
                page === p ? "bg-white" : "bg-white/20 text-white hover:bg-white/30"
              }`}
              style={page === p ? { color: t.presentation.accentColor } : undefined}
            >
              {labels[p]}
            </button>
          ))}
          {t.registrationOpen && !slideshow && (
            <a
              href={`#/inschrijven/${t.id}${
                window.location.hash.includes("?") ? "?" + window.location.hash.split("?")[1] : ""
              }`}
              className="cursor-pointer rounded-full bg-white/20 px-4 py-1.5 text-sm font-semibold text-white hover:bg-white/30"
            >
              Inschrijven
            </a>
          )}
          {!shared && (
            <button
              onClick={() => setSlideshow(!slideshow)}
              className={`ml-auto cursor-pointer rounded-full px-4 py-1.5 text-sm ${
                slideshow ? "bg-white/90 text-slate-900" : "bg-white/20 text-white hover:bg-white/30"
              }`}
              title="Diavoorstelling voor op een groot scherm: donker, groot en automatisch wisselend"
            >
              {slideshow ? "⏸ Presentatie stoppen" : "▶ Presentatie"}
            </button>
          )}
        </div>
      </nav>

      <LiveTicker t={t} />

      {!slideshow && allTeams.length > 0 && (
        <div className="border-b border-slate-200 bg-white px-4 py-2">
          <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-500">⭐ Mijn team:</span>
            <select
              className="cursor-pointer rounded border border-slate-200 px-2 py-1"
              value={myTeam}
              onChange={(e) => chooseTeam(e.target.value)}
            >
              <option value="">— kies je team —</option>
              {allTeams.map(({ team, division }) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                  {t.divisions.length > 1 ? ` (${division.name})` : ""}
                </option>
              ))}
            </select>
            {myTeam && (
              <button className="cursor-pointer text-xs underline" style={{ color: "var(--accent)" }} onClick={shareTeamLink}>
                {copied ? "✓ Link gekopieerd" : "📣 Deel met je team"}
              </button>
            )}
          </div>
        </div>
      )}

      <main className={`mx-auto space-y-8 px-4 py-8 ${slideshow ? "max-w-6xl" : "max-w-4xl"}`}>
        {shared && !live && !slideshow && (
          <p className="rounded bg-slate-100 px-3 py-2 text-center text-xs text-slate-500">
            Gedeelde momentopname — vraag de organisator om een nieuwe link voor de laatste stand.
          </p>
        )}
        {live && !slideshow && (
          <p className="rounded bg-green-50 px-3 py-2 text-center text-xs text-green-700">
            ● Live — standen en uitslagen worden automatisch bijgewerkt.
          </p>
        )}

        {myTeam && !slideshow && <NextMatchCard t={t} teamId={myTeam} />}

        <AdBlock t={t} />

        {page === "standen" && t.divisions.map((d) => <ChampionBanner key={`c-${d.id}`} t={t} d={d} />)}

        {page === "toernooi" && <ToernooiInfo t={t} />}
        {page === "standen" && t.divisions.map((d) => <Standen key={d.id} t={t} d={d} myTeam={myTeam} />)}
        {page === "schema" && (
          <SchemaView
            t={t}
            myTeam={myTeam}
            onFieldClick={pages.includes("plattegrond") ? showFieldOnMap : undefined}
          />
        )}
        {page === "plattegrond" && (
          <VenueMapView t={t} highlightFieldId={pinnedField ?? nextFieldFor(t, myTeam)} />
        )}

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

/** Doorlopende ticker met uitslagen en komende wedstrijden, uit de echte data. */
function LiveTicker({ t }: { t: Tournament }) {
  const rows = scheduledMatches(t);
  const fieldName = (id?: string) => t.fields.find((f) => f.id === id)?.name;
  const items: string[] = [];
  for (const { match: m, division: d } of rows) {
    const a = slotLabel(m.a, d, t.scoring);
    const b = slotLabel(m.b, d, t.scoring);
    if (isPlayed(m)) items.push(`${a} ${m.scoreA}–${m.scoreB} ${b}`);
    else if (m.start) items.push(`${m.start}${m.fieldId ? ` · ${fieldName(m.fieldId)}` : ""} · ${a} — ${b}`);
    if (items.length >= 14) break;
  }
  if (items.length < 3) return null;
  const doubled = [...items, ...items];
  return (
    <div className="overflow-hidden bg-slate-950 py-1.5">
      <div className="ticker gap-10">
        {doubled.map((s, i) => (
          <span key={i} className="score whitespace-nowrap text-xs text-white/60">
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Kampioensbanner: verschijnt zodra de finale van een divisie beslist is. */
function ChampionBanner({ t, d }: { t: Tournament; d: Division }) {
  for (const s of [...d.stages].reverse()) {
    if (s.type !== "bracket") continue;
    const finale = s.rounds[s.rounds.length - 1]?.matches[0];
    if (!finale) continue;
    const w = winnerOf(finale);
    if (!w) return null;
    const team = resolveSlot(w === "a" ? finale.a : finale.b, d, t.scoring);
    if (!team) return null;
    return (
      <div className="stadium fade-in relative overflow-hidden rounded-2xl p-6 text-center text-white">
        <Confetti count={18} />
        <div className="relative flex flex-col items-center gap-2">
          <Trophy size={110} />
          <div className="mt-2 text-xs font-bold uppercase tracking-widest text-white/70">
            {t.divisions.length > 1 ? `Kampioen ${d.name}` : "Kampioen"}
          </div>
          <div className="flex items-center gap-2 text-3xl font-black tracking-tight">
            <TeamBadge team={team} size={30} />
            {team.name}
          </div>
        </div>
      </div>
    );
  }
  return null;
}

/** Het veld van de eerstvolgende wedstrijd van mijn team (voor de plattegrond-📍). */
function nextFieldFor(t: Tournament, teamId: string): string | undefined {
  if (!teamId) return undefined;
  const next = teamMatches(t, teamId).find(({ match: m }) => !isPlayed(m));
  return next?.match.fieldId;
}

/** Alle wedstrijden van één team (ook toekomstige zodra placeholders bekend zijn). */
function teamMatches(t: Tournament, teamId: string): { match: Match; division: Division }[] {
  return scheduledMatches(t).filter(({ match: m, division: d }) => {
    const a = resolveSlot(m.a, d, t.scoring);
    const b = resolveSlot(m.b, d, t.scoring);
    return a?.id === teamId || b?.id === teamId;
  });
}

/** Grote kaart: de eerstvolgende wedstrijd van mijn team. */
function NextMatchCard({ t, teamId }: { t: Tournament; teamId: string }) {
  const mine = teamMatches(t, teamId);
  const next = mine.find(({ match: m }) => !isPlayed(m));
  const played = mine.filter(({ match: m }) => isPlayed(m));
  const fieldName = (id?: string) => t.fields.find((f) => f.id === id)?.name;
  const team = t.divisions.flatMap((d) => d.teams).find((tm) => tm.id === teamId);

  if (!next && mine.length === 0)
    return (
      <div className="card p-4 text-sm text-slate-500">
        Nog geen wedstrijden bekend voor <b>{team?.name}</b>.
      </div>
    );

  return (
    <div className="card fade-in overflow-hidden">
      <div className="px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-white" style={{ background: "var(--accent)" }}>
        {next ? "Jullie volgende wedstrijd" : "Alle wedstrijden gespeeld"}
      </div>
      {next && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 p-4">
          <span className="score text-3xl font-black" style={{ color: "var(--accent)" }}>
            {next.match.start ?? "—"}
          </span>
          <div className="min-w-0">
            <div className="font-semibold">
              {slotLabel(next.match.a, next.division, t.scoring)} — {slotLabel(next.match.b, next.division, t.scoring)}
            </div>
            <div className="text-sm text-slate-500">
              {fieldName(next.match.fieldId) ?? "veld n.t.b."}
              {next.match.label ? ` · ${next.match.label}` : ""}
              {t.divisions.length > 1 ? ` · ${next.division.name}` : ""}
            </div>
          </div>
        </div>
      )}
      {played.length > 0 && (
        <div className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
          Gespeeld:{" "}
          {played
            .map(
              ({ match: m, division: d }) =>
                `${slotLabel(m.a, d, t.scoring)} ${m.scoreA}–${m.scoreB} ${slotLabel(m.b, d, t.scoring)}`
            )
            .join(" · ")}
        </div>
      )}
    </div>
  );
}

function RankBadge({ pos }: { pos: number }) {
  const cls =
    pos === 1
      ? "bg-amber-400 text-amber-950"
      : pos === 2
        ? "bg-slate-300 text-slate-700"
        : pos === 3
          ? "bg-orange-300 text-orange-900"
          : "text-slate-400";
  return (
    <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${cls}`}>
      {pos}
    </span>
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

function Standen({ t, d, myTeam }: { t: Tournament; d: Division; myTeam?: string }) {
  const teamName = (id: string) => d.teams.find((tm) => tm.id === id)?.name ?? "?";
  if (d.stages.length === 0) return null;

  return (
    <div className="fade-in">
      {t.divisions.length > 1 && <h2 className="mb-3 text-xl font-bold">{d.name}</h2>}
      <div className="grid gap-4 md:grid-cols-2">
        {d.stages.map((s) => {
          if (s.type === "poules")
            return s.poules.map((p) => {
              const qual = qualifyingRanks(d, p.id);
              const maxQual = qual.length > 0 ? Math.max(...qual) : 0;
              return (
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
                      {pouleStandings(p, t.scoring).map((r, i) => {
                        const qualifies = maxQual > 0 && i + 1 <= maxQual;
                        const mine = myTeam === r.teamId;
                        return (
                          <tr
                            key={r.teamId}
                            className={`border-t border-slate-100 ${mine ? "font-semibold" : ""}`}
                            style={{
                              boxShadow: qualifies ? "inset 3px 0 0 var(--accent)" : undefined,
                              background: mine ? "var(--accent-soft)" : undefined,
                            }}
                          >
                            <td className="py-1"><RankBadge pos={i + 1} /></td>
                            <td className="font-medium">
                              <span className="flex items-center gap-1.5">
                                <TeamBadge team={d.teams.find((tm) => tm.id === r.teamId)} size={18} />
                                {teamName(r.teamId)}
                                {mine && <span className="text-xs" style={{ color: "var(--accent)" }}>⭐</span>}
                              </span>
                            </td>
                            <td className="text-center">{r.played}</td>
                            <td className="text-center">{r.goalDiff > 0 ? `+${r.goalDiff}` : r.goalDiff}</td>
                            <td className="score text-center font-bold">{r.points}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {maxQual > 0 && (
                    <p className="mt-2 text-xs text-slate-400">
                      Nr. 1{maxQual > 1 ? `–${maxQual}` : ""} gaat door naar de knock-outfase
                    </p>
                  )}
                </div>
              );
            });
          if (s.type === "bracket")
            return (
              <div key={s.id} className="card p-4 md:col-span-2">
                <div className="mb-2 flex items-center gap-2 font-semibold">
                  {s.name}
                  {!s.started && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-500">
                      start na de groepsfase
                    </span>
                  )}
                </div>
                <div className="flex gap-6 overflow-x-auto pb-2">
                  {s.rounds.map((r, ri) => (
                    <div key={ri} className="min-w-44">
                      <div className="mb-2 text-xs font-semibold uppercase text-slate-500">{r.name}</div>
                      <div className="space-y-3">
                        {r.matches.map((m) => (
                          <div key={m.id} className="rounded border border-slate-200 p-2 text-sm">
                            <div className="flex justify-between gap-2">
                              <span className="truncate">{slotLabel(m.a, d, t.scoring)}</span>
                              <b className="score" style={{ color: "var(--accent)" }}>{m.scoreA ?? ""}</b>
                            </div>
                            <div className="flex justify-between gap-2 border-t border-slate-100 pt-1">
                              <span className="truncate">{slotLabel(m.b, d, t.scoring)}</span>
                              <b className="score" style={{ color: "var(--accent)" }}>{m.scoreB ?? ""}</b>
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
                      <td className="py-1"><RankBadge pos={i + 1} /></td>
                      <td className="font-medium">{d.players.find((p) => p.id === r.playerId)?.name ?? "?"}</td>
                      <td className="text-center">{r.played}</td>
                      <td className="score text-center font-bold">{r.points}</td>
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

function SchemaView({
  t,
  myTeam,
  onFieldClick,
}: {
  t: Tournament;
  myTeam?: string;
  onFieldClick?: (fieldId: string) => void;
}) {
  const rows = scheduledMatches(t);
  const fieldName = (id?: string) => t.fields.find((f) => f.id === id)?.name ?? "—";
  const onMap = new Set((t.venueMap?.blocks ?? []).map((b) => b.fieldId).filter(Boolean));
  if (rows.length === 0) return <p className="text-center text-slate-500">Nog geen speelschema.</p>;

  // pauzes en evenementen verweven in de chronologische lijst
  type Row =
    | { kind: "match"; match: Match; division: Division }
    | { kind: "event"; event: NonNullable<Tournament["scheduleEvents"]>[number] };
  const merged: Row[] = [
    ...rows.map(({ match, division }) => ({ kind: "match" as const, match, division })),
    ...(t.scheduleEvents ?? [])
      .filter((e) => e.start && e.fieldId)
      .map((event) => ({ kind: "event" as const, event })),
  ].sort((a, b) => {
    const ta = (a.kind === "match" ? a.match.start : a.event.start) ?? "99:99";
    const tb = (b.kind === "match" ? b.match.start : b.event.start) ?? "99:99";
    return ta.localeCompare(tb);
  });

  // per veld: de eerste niet-gespeelde wedstrijd is "nu bezig" zodra de starttijd voorbij is
  const now = nowHHMM();
  const busy = new Set<string>();
  const seenField = new Set<string>();
  for (const { match: m } of rows) {
    if (isPlayed(m) || !m.start || !m.fieldId || seenField.has(m.fieldId)) continue;
    seenField.add(m.fieldId);
    if (m.start <= now) busy.add(m.id);
  }

  const involvesMyTeam = (m: Match, d: Division) => {
    if (!myTeam) return false;
    return (
      resolveSlot(m.a, d, t.scoring)?.id === myTeam || resolveSlot(m.b, d, t.scoring)?.id === myTeam
    );
  };

  return (
    <div className="card fade-in overflow-x-auto">
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
          {merged.map((row) => {
            if (row.kind === "event") {
              const e = row.event;
              return (
                <tr key={e.id} className="border-b border-slate-100" style={{ background: "var(--accent-soft)" }}>
                  <td className="score px-3 py-2">{e.start}</td>
                  <td className="px-3 py-2">{fieldName(e.fieldId)}</td>
                  <td className="px-3 py-2" colSpan={2}>
                    <span className="font-semibold">
                      {e.kind === "pauze" ? "☕" : "🎉"} {e.label}
                    </span>
                    <span className="ml-2 text-xs text-slate-500">{e.durationMin} min</span>
                  </td>
                </tr>
              );
            }
            const { match: m, division: d } = row;
            const done = isPlayed(m);
            const mine = involvesMyTeam(m, d);
            return (
              <tr
                key={m.id}
                className={`border-b border-slate-100 ${done ? "text-slate-400" : ""}`}
                style={{
                  background: mine ? "var(--accent-soft)" : undefined,
                  boxShadow: mine ? "inset 3px 0 0 var(--accent)" : undefined,
                }}
              >
                <td className="score px-3 py-2">{m.start ?? "—"}</td>
                <td className="px-3 py-2">
                  {m.fieldId && onFieldClick && onMap.has(m.fieldId) ? (
                    <button
                      className="cursor-pointer whitespace-nowrap underline decoration-dotted underline-offset-2"
                      style={{ color: "var(--accent)" }}
                      title="Toon dit veld op de plattegrond"
                      onClick={() => onFieldClick(m.fieldId!)}
                    >
                      🗺️ {fieldName(m.fieldId)}
                    </button>
                  ) : (
                    fieldName(m.fieldId)
                  )}
                </td>
                <td className="px-3 py-2">
                  <span className={mine ? "font-semibold" : ""}>
                    {slotLabel(m.a, d, t.scoring)} — {slotLabel(m.b, d, t.scoring)}
                  </span>
                  {m.label && <span className="ml-2 text-xs text-slate-400">{m.label}</span>}
                  {busy.has(m.id) && (
                    <span
                      className="ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase text-white"
                      style={{ background: "var(--accent)" }}
                    >
                      ● bezig
                    </span>
                  )}
                </td>
                <td className="score px-3 py-2 text-center font-bold">
                  {done ? `${m.scoreA} – ${m.scoreB}` : ""}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
