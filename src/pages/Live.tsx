import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useTournament } from "../store";
import type { Division, Match, Tournament } from "../types";
import { isPlayed, pouleStandings } from "../logic/standings";
import { individualStandings } from "../logic/individual";
import { qualifyingRanks, resolveSlot, slotLabel, winnerOf } from "../logic/resolve";
import { addMinutes, scheduledMatches } from "../logic/schedule";
import { activeStage, stageMatches } from "../logic/phases";
import { copyText, decodeShare } from "../logic/share";
import { useCloudTournament } from "../logic/cloud";
import { AdBlock, Boarding, DonateButton } from "../components/monetization";
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

/**
 * Broadcast-link (/tv/:id) voor het kantinescherm, casten of mirroring:
 * opent direct in presentatiemodus, zonder bedieningsknoppen. Werkt op het
 * apparaat van de organisator (lokaal) en op elk ander scherm (via de cloud).
 */
export function Tv() {
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
        {cloud.error ?? "Toernooi niet gevonden."} <Link to="/" className="underline">Naar home</Link>
      </div>
    );
  return <LiveInner t={t} shared live={!local} presentation />;
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

/**
 * Presentatiemodus op een tv: schaal de inhoud zodat die het inhoudsvak vúlt —
 * omhoog bij weinig inhoud, omlaag als het anders niet past. De binnenbak
 * krijgt breedte 100%/schaal zodat de geschaalde inhoud precies de volle
 * breedte beslaat; de ResizeObserver laat de meting convergeren.
 */
function FitToScreen({ children }: { children: React.ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const measure = () => {
      const o = outer.current;
      const i = inner.current;
      if (!o || !i) return;
      const next = Math.min(1.6, Math.max(0.55, o.clientHeight / Math.max(1, i.scrollHeight)));
      setScale((cur) => (Math.abs(cur - next) > 0.02 ? next : cur));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (outer.current) ro.observe(outer.current);
    if (inner.current) ro.observe(inner.current);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={outer} className="h-full overflow-hidden">
      <div
        ref={inner}
        style={{
          width: `${100 / scale}%`,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function LiveInner({
  t,
  shared = false,
  live = false,
  presentation = false,
}: {
  t: Tournament | undefined;
  shared?: boolean;
  live?: boolean;
  /** broadcast-modus (/tv/:id): start direct in de diavoorstelling, zonder knoppen */
  presentation?: boolean;
}) {
  const [params] = useSearchParams();
  const [page, setPage] = useState<Page>("standen");
  const [slideshow, setSlideshow] = useState(presentation);
  const [slideIdx, setSlideIdx] = useState(0);
  const [myTeam, setMyTeam] = useState<string>("");
  const [copied, setCopied] = useState(false);
  // veld dat vanuit het schema is aangetikt (pin op de plattegrond)
  const [pinnedField, setPinnedField] = useState<string | null>(null);

  const goToPage = (p: Page) => {
    if (p !== "plattegrond") setPinnedField(null);
    if (slideshow) {
      const i = slides.findIndex((s) => s.page === p);
      if (i >= 0) setSlideIdx(i);
    }
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

  // presentatie: standen opgeknipt in dia's per divisie (max 2 poules per dia),
  // zodat elke dia groot en leesbaar is
  const slides = useMemo(() => {
    if (!t) return [] as { page: Page; divId?: string; chunk?: number }[];
    const out: { page: Page; divId?: string; chunk?: number }[] = [];
    for (const p of pages) {
      if (p !== "standen") {
        out.push({ page: p });
        continue;
      }
      const divs = t.divisions.filter((d) => d.stages.length > 0);
      if (divs.length === 0) {
        out.push({ page: p });
        continue;
      }
      for (const d of divs) {
        const s = activeStage(d);
        if (s?.type === "poules" && s.poules.length > 2) {
          for (let c = 0; c < Math.ceil(s.poules.length / 2); c++)
            out.push({ page: p, divId: d.id, chunk: c });
        } else {
          out.push({ page: p, divId: d.id });
        }
      }
    }
    return out;
  }, [pages, t]);
  const slide = slides.length ? slides[slideIdx % slides.length] : undefined;

  useEffect(() => {
    if (!slideshow || !t) return;
    const iv = setInterval(() => setSlideIdx((cur) => cur + 1), t.presentation.slideSeconds * 1000);
    return () => clearInterval(iv);
  }, [slideshow, t]);

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
      className={slideshow ? "flex h-screen flex-col overflow-hidden" : "min-h-screen"}
      data-pres={slideshow ? "true" : undefined}
      style={{ ["--accent" as string]: t.presentation.accentColor }}
    >
      <header
        className={`relative shrink-0 overflow-hidden px-6 text-white ${slideshow ? "py-6" : "py-10"} ${t.presentation.background ? "" : "stadium"}`}
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

      <nav className="accent-header sticky top-0 z-30 shrink-0 px-4 py-2">
        <div className={`mx-auto flex flex-wrap items-center gap-2 ${slideshow ? "max-w-6xl" : "max-w-4xl"}`}>
          {pages.map((p) => (
            <button
              key={p}
              onClick={() => goToPage(p)}
              className={`cursor-pointer rounded-full px-4 py-2.5 text-sm font-semibold ${
                (slideshow ? slide?.page : page) === p ? "bg-white" : "bg-white/20 text-white hover:bg-white/30"
              }`}
              style={(slideshow ? slide?.page : page) === p ? { color: t.presentation.accentColor } : undefined}
            >
              {labels[p]}
            </button>
          ))}
          {t.registrationOpen && !slideshow && (
            <a
              href={`#/inschrijven/${t.id}${
                window.location.hash.includes("?") ? "?" + window.location.hash.split("?")[1] : ""
              }`}
              className="cursor-pointer rounded-full bg-white/20 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/30"
            >
              Inschrijven
            </a>
          )}
          {!shared && !presentation && (
            <button
              onClick={() => setSlideshow(!slideshow)}
              className={`ml-auto cursor-pointer rounded-full px-4 py-2.5 text-sm ${
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
              className="cursor-pointer rounded border border-slate-200 px-3 py-2"
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
              <button
                className="cursor-pointer rounded-full border px-3 py-2 text-xs font-semibold"
                style={{ color: "var(--accent)", borderColor: "var(--accent)" }}
                title="Kopieert een link waarin jullie team al gekozen is — ideaal voor de groepsapp"
                onClick={shareTeamLink}
              >
                {copied ? "✓ Link gekopieerd" : "📣 Deel met je team"}
              </button>
            )}
          </div>
        </div>
      )}

      {(() => {
        const inhoud = (
          <>
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

            {page === "standen" ? (
              // de eerste stand eerst, dan pas reclame: het publiek komt voor de stand
              <>
                {t.divisions.map((d) => <ChampionBanner key={`c-${d.id}`} t={t} d={d} />)}
                {t.divisions[0] && (
                  <Standen key={t.divisions[0].id} t={t} d={t.divisions[0]} myTeam={myTeam} />
                )}
                <AdBlock t={t} />
                {t.divisions.slice(1).map((d) => (
                  <Standen key={d.id} t={t} d={d} myTeam={myTeam} />
                ))}
              </>
            ) : (
              <>
                <AdBlock t={t} />
                {page === "toernooi" && <ToernooiInfo t={t} />}
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
              </>
            )}

            <AdBlock t={t} slot={1} />

            {!slideshow && (
              <footer className="flex flex-col items-center gap-3 border-t border-slate-200 py-6 text-center text-xs text-slate-400">
                <div>
                  Gemaakt met <b>Toernooitje</b> — gratis toernooisoftware. Houd de app levend:
                </div>
                <DonateButton small />
              </footer>
            )}
          </>
        );
        if (!slideshow) return <main className="mx-auto max-w-4xl space-y-8 px-4 py-8">{inhoud}</main>;

        // tv-modus: één dia tegelijk (alleen de actieve fase), gevuld scherm,
        // met smalle reclame-boardings langs de zijkanten zoals rond een veld
        const presDiv = t.divisions.find((dd) => dd.id === slide?.divId) ?? t.divisions[0];
        const wide = slide?.page === "schema" || slide?.page === "plattegrond";
        return (
          <main className="min-h-0 w-full flex-1 overflow-hidden px-4 py-4">
            <div className="flex h-full gap-4">
              <Boarding t={t} side="left" />
              <div className="min-w-0 flex-1">
                <FitToScreen key={`${slide?.page}-${slide?.divId ?? ""}-${slide?.chunk ?? ""}`}>
                  <div className={`mx-auto space-y-6 ${wide ? "" : "max-w-6xl"}`}>
                    {slide?.page === "toernooi" && <ToernooiInfo t={t} />}
                    {slide?.page === "standen" && presDiv && (
                      <>
                        <ChampionBanner t={t} d={presDiv} />
                        <Standen t={t} d={presDiv} myTeam={myTeam} onlyActive pouleChunk={slide.chunk} />
                      </>
                    )}
                    {slide?.page === "schema" && <SchemaView t={t} myTeam={myTeam} pres />}
                    {slide?.page === "plattegrond" && (
                      <VenueMapView t={t} highlightFieldId={pinnedField ?? nextFieldFor(t, myTeam)} />
                    )}
                  </div>
                </FitToScreen>
              </div>
              <Boarding t={t} side="right" />
            </div>
          </main>
        );
      })()}
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
    if (m.inProgress) items.unshift(`🔴 LIVE · ${a} ${m.scoreA ?? 0}–${m.scoreB ?? 0} ${b}`);
    else if (isPlayed(m)) items.push(`${a} ${m.scoreA}–${m.scoreB} ${b}`);
    else if (m.start) items.push(`${m.start}${m.fieldId ? ` · ${fieldName(m.fieldId)}` : ""} · ${a} — ${b}`);
    if (items.length >= 14) break;
  }
  if (items.length < 3) return null;
  const doubled = [...items, ...items];
  return (
    <div className="shrink-0 overflow-hidden bg-slate-950 py-1.5">
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
        {next ? (next.match.inProgress ? "🔴 Jullie spelen nu" : "Jullie volgende wedstrijd") : "Alle wedstrijden gespeeld"}
      </div>
      {next && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 p-4">
          {next.match.inProgress ? (
            <span className="score flex items-center gap-2 text-3xl font-black text-red-500">
              <span className="live-dot inline-block h-3 w-3 rounded-full bg-red-500" />
              {next.match.scoreA ?? 0}–{next.match.scoreB ?? 0}
            </span>
          ) : (
            <span className="score text-3xl font-black" style={{ color: "var(--accent)" }}>
              {next.match.start ?? "—"}
              {next.match.start && (
                <span className="ml-1 text-base font-bold text-slate-400">
                  –{addMinutes(next.match.start, t.matchDuration)}
                </span>
              )}
            </span>
          )}
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

function Standen({
  t,
  d,
  myTeam,
  onlyActive,
  pouleChunk,
}: {
  t: Tournament;
  d: Division;
  myTeam?: string;
  /** presentatie: toon alleen de fase die nu bezig is */
  onlyActive?: boolean;
  /** presentatie: toon alleen poule 2c en 2c+1 van de actieve fase */
  pouleChunk?: number;
}) {
  const teamName = (id: string) => d.teams.find((tm) => tm.id === id)?.name ?? "?";
  if (d.stages.length === 0) return null;
  const act = onlyActive ? activeStage(d) : undefined;
  const stages = onlyActive ? (act ? [act] : []) : d.stages;

  return (
    <div className="fade-in">
      {t.divisions.length > 1 && <h2 className="mb-3 text-xl font-bold">{d.name}</h2>}
      <div className="grid gap-4 md:grid-cols-2">
        {stages.map((s) => {
          if (s.type === "poules") {
            const shown =
              pouleChunk !== undefined ? s.poules.slice(pouleChunk * 2, pouleChunk * 2 + 2) : s.poules;
            return shown.map((p) => {
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
          }
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
                        {r.matches.map((m) => {
                          const mineA = !!myTeam && resolveSlot(m.a, d, t.scoring)?.id === myTeam;
                          const mineB = !!myTeam && resolveSlot(m.b, d, t.scoring)?.id === myTeam;
                          return (
                            <div
                              key={m.id}
                              className="rounded border border-slate-200 p-2 text-sm"
                              style={
                                mineA || mineB
                                  ? { boxShadow: "inset 3px 0 0 var(--accent)", background: "var(--accent-soft)" }
                                  : undefined
                              }
                            >
                              <div className={`flex justify-between gap-2 ${mineA ? "font-semibold" : ""}`}>
                                <span className="truncate">
                                  {slotLabel(m.a, d, t.scoring)}
                                  {mineA && <span className="ml-1 text-xs" style={{ color: "var(--accent)" }}>⭐</span>}
                                </span>
                                <b className="score" style={{ color: "var(--accent)" }}>{m.scoreA ?? ""}</b>
                              </div>
                              <div className={`flex justify-between gap-2 border-t border-slate-100 pt-1 ${mineB ? "font-semibold" : ""}`}>
                                <span className="truncate">
                                  {slotLabel(m.b, d, t.scoring)}
                                  {mineB && <span className="ml-1 text-xs" style={{ color: "var(--accent)" }}>⭐</span>}
                                </span>
                                <b className="score" style={{ color: "var(--accent)" }}>{m.scoreB ?? ""}</b>
                              </div>
                            </div>
                          );
                        })}
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
  pres,
}: {
  t: Tournament;
  myTeam?: string;
  onFieldClick?: (fieldId: string) => void;
  /** presentatie: alleen actieve fases, geen gespeelde wedstrijden, max 12 rijen */
  pres?: boolean;
}) {
  // alleen de wedstrijden van mijn team tonen (scheelt scrollen bij 40+ wedstrijden)
  const [onlyMine, setOnlyMine] = useState(false);
  let rows = scheduledMatches(t);
  const fieldName = (id?: string) => t.fields.find((f) => f.id === id)?.name ?? "—";
  const onMap = new Set((t.venueMap?.blocks ?? []).map((b) => b.fieldId).filter(Boolean));
  if (rows.length === 0) return <p className="text-center text-slate-500">Nog geen speelschema.</p>;

  // presentatie: alleen wedstrijden van de fase die nu bezig is
  if (pres) {
    const activeIds = new Set<string>();
    for (const d of t.divisions) {
      const s = activeStage(d);
      if (s) for (const m of stageMatches(s)) activeIds.add(m.id);
    }
    rows = rows.filter((r) => activeIds.has(r.match.id));
  }

  // live gescoorde wedstrijden zijn zeker bezig; anders per veld de eerste
  // niet-gespeelde wedstrijd zodra de starttijd voorbij is (tijd-heuristiek)
  const now = nowHHMM();
  const busy = new Set<string>();
  const seenField = new Set<string>();
  for (const { match: m } of rows) {
    if (m.inProgress) {
      busy.add(m.id);
      if (m.fieldId) seenField.add(m.fieldId);
      continue;
    }
    if (isPlayed(m) || !m.start || !m.fieldId || seenField.has(m.fieldId)) continue;
    seenField.add(m.fieldId);
    if (m.start <= now) busy.add(m.id);
  }

  // presentatie: gespeelde wedstrijden eruit (behalve bezig), en aftoppen
  if (pres) rows = rows.filter((r) => !isPlayed(r.match) || busy.has(r.match.id)).slice(0, 12);

  // pauzes en evenementen verweven in de chronologische lijst
  type Row =
    | { kind: "match"; match: Match; division: Division }
    | { kind: "event"; event: NonNullable<Tournament["scheduleEvents"]>[number] };
  const merged: Row[] = [
    ...rows.map(({ match, division }) => ({ kind: "match" as const, match, division })),
    ...(t.scheduleEvents ?? [])
      .filter((e) => e.start && e.fieldId)
      .filter((e) => !pres || addMinutes(e.start!, e.durationMin) >= now)
      .map((event) => ({ kind: "event" as const, event })),
  ].sort((a, b) => {
    const ta = (a.kind === "match" ? a.match.start : a.event.start) ?? "99:99";
    const tb = (b.kind === "match" ? b.match.start : b.event.start) ?? "99:99";
    return ta.localeCompare(tb);
  });
  if (pres && merged.length === 0)
    return <p className="text-center text-slate-500">Alle wedstrijden zijn gespeeld 🎉</p>;

  const involvesMyTeam = (m: Match, d: Division) => {
    if (!myTeam) return false;
    return (
      resolveSlot(m.a, d, t.scoring)?.id === myTeam || resolveSlot(m.b, d, t.scoring)?.id === myTeam
    );
  };

  const shown =
    onlyMine && myTeam
      ? merged.filter((row) => row.kind === "event" || involvesMyTeam(row.match, row.division))
      : merged;

  return (
    <div className="fade-in">
    {myTeam && !pres && (
      <label className="mb-2 flex cursor-pointer items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          className="h-5 w-5 cursor-pointer accent-(--accent)"
          checked={onlyMine}
          onChange={(e) => setOnlyMine(e.target.checked)}
        />
        Toon alleen de wedstrijden van mijn team
      </label>
    )}
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
          {shown.map((row) => {
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
                <td className="score whitespace-nowrap px-3 py-2">
                  {m.start ? (
                    <>
                      {m.start}
                      <span className="text-xs text-slate-400">–{addMinutes(m.start, t.matchDuration)}</span>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
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
                  <span className={`inline-flex flex-wrap items-center gap-1 ${mine ? "font-semibold" : ""}`}>
                    <TeamBadge team={resolveSlot(m.a, d, t.scoring)} size={16} />
                    {slotLabel(m.a, d, t.scoring)} —{" "}
                    <TeamBadge team={resolveSlot(m.b, d, t.scoring)} size={16} />
                    {slotLabel(m.b, d, t.scoring)}
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
                  {m.inProgress ? (
                    <span className="flex items-center justify-center gap-1.5" style={{ color: "var(--accent)" }}>
                      <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
                      {m.scoreA ?? 0} – {m.scoreB ?? 0}
                    </span>
                  ) : done ? (
                    `${m.scoreA} – ${m.scoreB}`
                  ) : (
                    ""
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {shown.length === 0 && (
        <p className="px-3 py-4 text-center text-sm text-slate-500">
          Nog geen wedstrijden van jouw team in het schema.
        </p>
      )}
    </div>
    </div>
  );
}
