import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useApp, useTournament } from "../store";
import type { Match, Tournament } from "../types";
import { allMatches, slotLabel, winnerOf } from "../logic/resolve";
import { isPlayed } from "../logic/standings";
import { clientFromParams, pushScore, submitScore, useCloudTournament } from "../logic/cloud";
import { gatedMatchIds } from "../logic/phases";
import { DonateButton } from "../components/monetization";
import { Confetti, Trophy } from "../components/decor";

type SaveState = "saving" | "saved" | "error";

/**
 * Invoerportaal voor scheidsrechters (/scheids/:id/:refId — alleen eigen
 * wedstrijden, ook voor fluitende teams) en beheerders (/invoer/:id — alles).
 * Scores worden als concept ingevoerd en pas doorgevoerd met de Opslaan-knop:
 * zo gaat een score waarover nog discussie is niet per ongeluk live.
 * Opgeslagen uitslagen blijven altijd te wijzigen (typo's, herziene uitslag).
 */
export default function Portal() {
  const { id, refId } = useParams();
  const local = useTournament(id);
  if (local) return <LocalPortal t={local} refId={refId} />;
  return <CloudPortal id={id} refId={refId} />;
}

function LocalPortal({ t, refId }: { t: Tournament; refId?: string }) {
  const update = useApp((s) => s.updateTournament);
  const save = (matchId: string, a: number | undefined, b: number | undefined, live: boolean) => {
    update(t.id, (x) => {
      for (const d of x.divisions) {
        const m = allMatches(d).find((y) => y.id === matchId);
        if (m) {
          m.scoreA = a;
          m.scoreB = b;
          m.inProgress = live || undefined;
        }
      }
    });
    pushScore(t.id, matchId);
  };
  return <PortalView t={t} refId={refId} onSave={save} status={{}} />;
}

function CloudPortal({ id, refId }: { id?: string; refId?: string }) {
  const [params] = useSearchParams();
  const writeKey = params.get("k");
  const { t, loading, error, refresh } = useCloudTournament(id, params.get("s"), params.get("a"));
  // opgeslagen waarden over de serverdata heen leggen tot de refresh ze bevestigt
  const [pending, setPending] = useState<Record<string, { a?: number; b?: number; live?: boolean }>>({});
  const [status, setStatus] = useState<Record<string, SaveState>>({});

  if (loading) return <div className="p-10 text-center text-slate-500">Laden…</div>;
  if (error || !t)
    return (
      <div className="p-10 text-center">
        {error ?? "Toernooi niet gevonden."} <Link to="/" className="underline">Naar home</Link>
      </div>
    );
  if (!writeKey)
    return (
      <div className="p-10 text-center text-slate-600">
        Deze invoerlink is onvolledig (schrijfsleutel ontbreekt). Vraag de organisator om de link
        opnieuw te kopiëren.
      </div>
    );

  for (const d of t.divisions) {
    for (const m of allMatches(d)) {
      const p = pending[m.id];
      if (p) {
        if ("a" in p) m.scoreA = p.a;
        if ("b" in p) m.scoreB = p.b;
        if ("live" in p) m.inProgress = p.live || undefined;
      }
    }
  }

  const save = (matchId: string, a: number | undefined, b: number | undefined, live: boolean) => {
    setPending((prev) => ({ ...prev, [matchId]: { a, b, live } }));
    setStatus((s) => ({ ...s, [matchId]: "saving" }));
    const sb = clientFromParams(null, null);
    if (!sb) {
      setStatus((s) => ({ ...s, [matchId]: "error" }));
      return;
    }
    submitScore(sb, t.id, writeKey, matchId, a ?? null, b ?? null, null, null, live)
      .then(() => {
        setStatus((s) => ({ ...s, [matchId]: "saved" }));
        refresh();
      })
      .catch(() => setStatus((s) => ({ ...s, [matchId]: "error" })));
  };

  return (
    <PortalView
      t={t}
      refId={refId}
      onSave={save}
      status={status}
      onRetry={(matchId) => {
        const p = pending[matchId];
        if (p) save(matchId, p.a, p.b, p.live ?? false);
      }}
      cloud
    />
  );
}

function PortalView({
  t,
  refId,
  onSave,
  status,
  onRetry,
  cloud = false,
}: {
  t: Tournament;
  refId?: string;
  onSave: (matchId: string, a: number | undefined, b: number | undefined, live: boolean) => void;
  status: Record<string, SaveState>;
  onRetry?: (matchId: string) => void;
  cloud?: boolean;
}) {
  const liveMode = !!t.liveScoring;
  const [showDone, setShowDone] = useState(false);
  // de link kan van een scheidsrechter zijn, of van een team dat fluit
  const referee = refId ? t.referees.find((r) => r.id === refId) : undefined;
  const refTeam = refId && !referee
    ? t.divisions.flatMap((d) => d.teams).find((tm) => tm.id === refId)
    : undefined;
  if (refId && !referee && !refTeam)
    return <div className="p-10 text-center">Ongeldige scheidsrechterlink.</div>;
  const refName = referee?.name ?? refTeam?.name;

  // wedstrijden in fases die de organisator nog niet gestart heeft, blijven buiten beeld
  const gated = gatedMatchIds(t.divisions);
  const rows = t.divisions
    .flatMap((d) => allMatches(d).map((m) => ({ m, d })))
    .filter(({ m }) => !gated.has(m.id))
    .filter(({ m }) => !refId || m.refereeId === refId || m.refereeTeamId === refId)
    .sort((a, b) => (a.m.start ?? "99:99").localeCompare(b.m.start ?? "99:99"));

  const fieldName = (fid?: string) => t.fields.find((f) => f.id === fid)?.name;
  const open = rows.filter(({ m }) => !isPlayed(m));
  const done = rows.filter(({ m }) => isPlayed(m));

  return (
    <div className="min-h-screen" style={{ ["--accent" as string]: t.presentation.accentColor }}>
      <header className="stadium sticky top-0 z-30 px-4 py-4 text-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">{t.name}</h1>
            <p className="text-xs opacity-80">
              {refName ? `Uitslagen invoeren — ${refName}` : "Uitslagen invoeren — beheerder"}
              {cloud && " · live verbonden"}
            </p>
          </div>
          <DonateButton small />
        </div>
        {rows.length > 0 && (
          <div className="mx-auto mt-2 h-1.5 max-w-2xl overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full bg-white/90 transition-all"
              style={{ width: `${(done.length / rows.length) * 100}%` }}
            />
          </div>
        )}
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        <p className="mb-4 text-sm text-slate-500">
          {done.length} van {rows.length} uitslagen ingevuld
        </p>
        {rows.length === 0 && (
          <p className="text-center text-slate-500">
            {refName
              ? `Er zijn nog geen wedstrijden aan ${refName} toegewezen. Plan het schema (opnieuw) op de Schema-pagina.`
              : "Er zijn nog geen wedstrijden."}
          </p>
        )}

        {rows.length > 0 && open.length === 0 && (
          <div className="stadium fade-in relative mb-4 overflow-hidden rounded-2xl p-6 text-center text-white">
            <Confetti count={14} />
            <div className="relative flex flex-col items-center gap-2">
              <Trophy size={90} />
              <div className="text-xl font-black tracking-tight">Alles ingevuld — bedankt!</div>
              <p className="text-sm text-white/75">
                Alle {rows.length} uitslagen staan erin. Tijd voor een bakkie in de kantine. ☕
              </p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {open.map(({ m, d }, i) => (
            <PortalRow
              key={m.id}
              highlight={i === 0}
              liveMode={liveMode}
              start={m.start}
              field={fieldName(m.fieldId)}
              division={t.divisions.length > 1 ? d.name : undefined}
              a={slotLabel(m.a, d, t.scoring)}
              b={slotLabel(m.b, d, t.scoring)}
              m={m}
              state={status[m.id]}
              onRetry={onRetry ? () => onRetry(m.id) : undefined}
              onSave={(a, b, live) => onSave(m.id, a, b, live)}
            />
          ))}
        </div>

        {done.length > 0 && (
          <div className="mt-6">
            <button
              className="btn-ghost w-full justify-start text-sm"
              onClick={() => setShowDone(!showDone)}
            >
              {showDone ? "▾" : "▸"} {done.length} gespeeld — {showDone ? "verberg" : "toon en wijzig"}
            </button>
            {showDone && (
              <div className="mt-2 space-y-2">
                <p className="text-xs text-slate-500">
                  Uitslag herzien na discussie of een typo? Pas de score aan en druk opnieuw op
                  Opslaan.
                </p>
                {done.map(({ m, d }) => (
                  <PortalRow
                    key={m.id}
                    start={m.start}
                    field={fieldName(m.fieldId)}
                    division={t.divisions.length > 1 ? d.name : undefined}
                    a={slotLabel(m.a, d, t.scoring)}
                    b={slotLabel(m.b, d, t.scoring)}
                    m={m}
                    state={status[m.id]}
                    onRetry={onRetry ? () => onRetry(m.id) : undefined}
                    onSave={(a, b, live) => onSave(m.id, a, b, live)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function PortalRow({
  start,
  field,
  division,
  a,
  b,
  m,
  state,
  highlight = false,
  liveMode = false,
  onRetry,
  onSave,
}: {
  start?: string;
  field?: string;
  division?: string;
  a: string;
  b: string;
  m: Match;
  state?: SaveState;
  highlight?: boolean;
  liveMode?: boolean;
  onRetry?: () => void;
  onSave: (a: number | undefined, b: number | undefined, live: boolean) => void;
}) {
  const played = isPlayed(m);
  // concept-invoer: pas doorgevoerd na een druk op Opslaan
  const [draft, setDraft] = useState<{ a: string; b: string } | null>(null);
  const shownA = draft ? draft.a : m.scoreA !== undefined ? String(m.scoreA) : "";
  const shownB = draft ? draft.b : m.scoreB !== undefined ? String(m.scoreB) : "";
  const dirty =
    draft !== null &&
    (draft.a !== (m.scoreA !== undefined ? String(m.scoreA) : "") ||
      draft.b !== (m.scoreB !== undefined ? String(m.scoreB) : ""));

  const edit = (side: "a" | "b", val: string) =>
    setDraft({ a: side === "a" ? val : shownA, b: side === "b" ? val : shownB });

  const commit = () => {
    if (!draft) return;
    const parse = (v: string) => (v === "" ? undefined : Math.max(0, +v));
    onSave(parse(draft.a), parse(draft.b), false);
    setDraft(null);
  };

  // ---- live scoren: doelpunt voor doelpunt, direct zichtbaar voor iedereen ----
  if (liveMode && !played) {
    const live = !!m.inProgress;
    const sa = m.scoreA ?? 0;
    const sb = m.scoreB ?? 0;
    const goal = (side: "a" | "b", delta: number) =>
      onSave(
        Math.max(0, sa + (side === "a" ? delta : 0)),
        Math.max(0, sb + (side === "b" ? delta : 0)),
        true
      );
    return (
      <div
        className="card p-3"
        style={
          live
            ? { boxShadow: "0 0 0 2px #ef4444" }
            : highlight
              ? { boxShadow: "0 0 0 2px var(--accent)" }
              : undefined
        }
      >
        <div className="mb-1 flex flex-wrap items-center gap-3 text-xs text-slate-400">
          {live ? (
            <span className="flex items-center gap-1.5 font-bold uppercase text-red-500">
              <span className="live-dot inline-block h-2 w-2 rounded-full bg-red-500" /> Live
            </span>
          ) : (
            highlight && (
              <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase text-white" style={{ background: "var(--accent)" }}>
                Volgende wedstrijd
              </span>
            )
          )}
          {start && <span className="score">🕐 {start}</span>}
          {field && <span>🟩 {field}</span>}
          {division && <span>{division}</span>}
          {m.label && <span>{m.label}</span>}
          <span className="ml-auto">
            {state === "saving" && <span className="text-slate-400">↻ opslaan…</span>}
            {state === "saved" && <span className="text-green-600">✓</span>}
            {state === "error" && (
              <button className="cursor-pointer font-semibold text-red-600 underline" onClick={onRetry}>
                ⚠ opnieuw
              </button>
            )}
          </span>
        </div>

        {!live ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="min-w-0 flex-1 truncate text-base font-medium">
              {a} <span className="text-slate-400">—</span> {b}
            </span>
            <button className="btn-primary shrink-0" onClick={() => onSave(0, 0, true)}>
              ▶ Start wedstrijd
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              {(
                [
                  { name: a, score: sa, side: "a" as const },
                  { name: b, score: sb, side: "b" as const },
                ]
              ).map((x, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                  <span className="max-w-full truncate text-sm font-medium">{x.name}</span>
                  <span className="score text-4xl font-black" style={{ color: "var(--accent)" }}>
                    {x.score}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      className="h-12 w-16 cursor-pointer rounded-xl text-xl font-black text-white shadow active:scale-95"
                      style={{ background: "var(--accent)" }}
                      onClick={() => goal(x.side, 1)}
                    >
                      +1
                    </button>
                    <button
                      className="h-8 w-8 cursor-pointer rounded-lg bg-slate-200 text-sm font-bold text-slate-600 active:scale-95"
                      title="Correctie: doelpunt eraf"
                      onClick={() => goal(x.side, -1)}
                    >
                      −1
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              className="btn-outline mt-3 w-full"
              onClick={() => {
                if (confirm(`Eindstand ${sa} – ${sb} opslaan? De uitslag telt dan mee in de stand.`))
                  onSave(sa, sb, false);
              }}
            >
              🏁 Eindstand opslaan ({sa} – {sb})
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div
      className={`card p-3 ${played && !dirty ? "bg-green-50/50" : ""}`}
      style={highlight ? { boxShadow: "0 0 0 2px var(--accent)" } : undefined}
    >
      <div className="mb-1 flex flex-wrap items-center gap-3 text-xs text-slate-400">
        {highlight && (
          <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase text-white" style={{ background: "var(--accent)" }}>
            Nu invoeren
          </span>
        )}
        {start && <span className="score">🕐 {start}</span>}
        {field && <span>🟩 {field}</span>}
        {division && <span>{division}</span>}
        {m.label && <span>{m.label}</span>}
        {played && !dirty && winnerOf(m) === null && m.scoreA === m.scoreB && <span>gelijkspel</span>}
        <span className="ml-auto">
          {dirty && <span className="font-semibold text-amber-600">niet opgeslagen</span>}
          {!dirty && state === "saving" && <span className="text-slate-400">↻ opslaan…</span>}
          {!dirty && state === "saved" && <span className="text-green-600">✓ opgeslagen</span>}
          {!dirty && state === "error" && (
            <button className="cursor-pointer font-semibold text-red-600 underline" onClick={onRetry}>
              ⚠ niet opgeslagen — opnieuw
            </button>
          )}
          {!dirty && !state && played && <span className="text-green-600">✓</span>}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="flex-1 truncate text-right text-base font-medium">{a}</span>
        <input
          type="number"
          min={0}
          inputMode="numeric"
          className="score-input"
          value={shownA}
          onChange={(e) => edit("a", e.target.value)}
        />
        <span className="text-slate-400">–</span>
        <input
          type="number"
          min={0}
          inputMode="numeric"
          className="score-input"
          value={shownB}
          onChange={(e) => edit("b", e.target.value)}
        />
        <span className="flex-1 truncate text-base font-medium">{b}</span>
      </div>
      {dirty && (
        <div className="mt-2 flex items-center justify-end gap-2">
          <button className="btn-ghost text-xs" onClick={() => setDraft(null)}>
            Annuleer
          </button>
          <button className="btn-primary" onClick={commit}>
            💾 Opslaan
          </button>
        </div>
      )}
    </div>
  );
}
