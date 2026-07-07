import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";
import type { Registration, Tournament } from "../types";
import { allMatches } from "./resolve";
import { useApp } from "../store";

/**
 * Online synchronisatie via Supabase (gratis tier). De organisator plakt
 * eenmalig zijn eigen Supabase-URL + anon key; die bewaren we lokaal.
 * Het toernooi staat als jsonb-blob online, losse uitslagen in een aparte
 * scores-tabel zodat meerdere scheidsrechters elkaar niet overschrijven.
 */

export interface CloudConfig {
  url: string;
  anonKey: string;
}

const CONFIG_KEY = "toernooitje-supabase";

export function getCloudConfig(): CloudConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as CloudConfig;
    return c.url && c.anonKey ? c : null;
  } catch {
    return null;
  }
}

export function setCloudConfig(c: CloudConfig | null): void {
  if (c) localStorage.setItem(CONFIG_KEY, JSON.stringify(c));
  else localStorage.removeItem(CONFIG_KEY);
  client = undefined;
}

let client: SupabaseClient | undefined;

export function getClient(): SupabaseClient | null {
  if (client) return client;
  const c = getCloudConfig();
  if (!c) return null;
  client = createClient(c.url, c.anonKey);
  return client;
}

/** Kijkers hebben ook een client nodig; de config reist mee in de link (?s=url&k=anonkey). */
export function clientFromParams(url: string | null, anonKey: string | null): SupabaseClient | null {
  if (url && anonKey) {
    setCloudConfig({ url, anonKey });
    return getClient();
  }
  return getClient();
}

export interface ScoreRow {
  match_id: string;
  score_a: number | null;
  score_b: number | null;
  pens_a: number | null;
  pens_b: number | null;
}

/** Zet het toernooi online (of werk de online versie bij). De writeKey blijft geheim. */
export async function publishTournament(t: Tournament): Promise<void> {
  const sb = getClient();
  if (!sb || !t.cloud) return;
  const slim: Tournament = JSON.parse(JSON.stringify(t));
  delete (slim as Partial<Tournament>).cloud; // sleutel nooit publiceren
  const { error } = await sb.rpc("publish_tournament", {
    p_id: t.id,
    p_key: t.cloud.writeKey,
    p_data: slim,
  });
  if (error) throw new Error(error.message);
}

export async function submitScore(
  sb: SupabaseClient,
  tid: string,
  writeKey: string,
  matchId: string,
  a: number | null,
  b: number | null,
  pa: number | null = null,
  pb: number | null = null
): Promise<void> {
  const { error } = await sb.rpc("submit_score", {
    p_tid: tid,
    p_key: writeKey,
    p_match: matchId,
    p_a: a,
    p_b: b,
    p_pa: pa,
    p_pb: pb,
  });
  if (error) throw new Error(error.message);
}

/**
 * Stuur de actuele score van een wedstrijd uit de lokale opslag naar de
 * scores-tabel. Aanroepen ná elke score-wijziging door de organisator, zodat
 * zijn correcties ook winnen van eerdere scheidsrechter-invoer.
 */
export function pushScore(tournamentId: string, matchId: string): void {
  const t = useApp.getState().tournaments.find((x) => x.id === tournamentId);
  if (!t?.cloud?.online) return;
  const sb = getClient();
  if (!sb) return;
  for (const d of t.divisions) {
    const m = allMatches(d).find((y) => y.id === matchId);
    if (m) {
      submitScore(
        sb,
        t.id,
        t.cloud.writeKey,
        matchId,
        m.scoreA ?? null,
        m.scoreB ?? null,
        m.pensA ?? null,
        m.pensB ?? null
      ).catch(() => {});
      return;
    }
  }
}

interface RegistrationRow {
  id: string;
  division_id: string | null;
  team_name: string;
  contact: string | null;
  email: string | null;
  phone: string | null;
  note: string | null;
  status: string;
  created_at: string;
}

/** Team schrijft zich in via de publieke inschrijfpagina. */
export async function submitRegistration(
  sb: SupabaseClient,
  tid: string,
  reg: Registration
): Promise<void> {
  const { error } = await sb.rpc("submit_registration", {
    p_id: reg.id,
    p_tid: tid,
    p_division: reg.divisionId ?? null,
    p_team: reg.teamName,
    p_contact: reg.contact ?? null,
    p_email: reg.email ?? null,
    p_phone: reg.phone ?? null,
    p_note: reg.note ?? null,
  });
  if (error) throw new Error(error.message);
}

/** Organisator haalt inschrijvingen op (alleen met de geheime sleutel). */
export async function listRegistrations(
  sb: SupabaseClient,
  tid: string,
  writeKey: string
): Promise<Registration[]> {
  const { data, error } = await sb.rpc("list_registrations", { p_tid: tid, p_key: writeKey });
  if (error) throw new Error(error.message);
  return ((data as RegistrationRow[]) ?? []).map((r) => ({
    id: r.id,
    divisionId: r.division_id ?? undefined,
    teamName: r.team_name,
    contact: r.contact ?? undefined,
    email: r.email ?? undefined,
    phone: r.phone ?? undefined,
    note: r.note ?? undefined,
    status: (r.status as Registration["status"]) ?? "nieuw",
    createdAt: r.created_at,
  }));
}

/** Accepteren/afwijzen doorzetten naar de server (fire-and-forget). */
export function decideRegistration(tournamentId: string, regId: string, status: string): void {
  const t = useApp.getState().tournaments.find((x) => x.id === tournamentId);
  if (!t?.cloud?.online) return;
  const sb = getClient();
  if (!sb) return;
  sb.rpc("decide_registration", {
    p_tid: t.id,
    p_key: t.cloud.writeKey,
    p_rid: regId,
    p_status: status,
  }).then(
    () => {},
    () => {}
  );
}

/** Queryparameters voor links naar andere apparaten (server + schrijfsleutel). */
export function liveQuery(t: Tournament, withKey: boolean): string {
  const c = getCloudConfig();
  if (!t.cloud?.online || !c) return "";
  const base = `?s=${encodeURIComponent(c.url)}&a=${encodeURIComponent(c.anonKey)}`;
  return withKey ? `${base}&k=${encodeURIComponent(t.cloud.writeKey)}` : base;
}

export async function fetchCloudTournament(
  sb: SupabaseClient,
  id: string
): Promise<Tournament | null> {
  const [tRes, sRes] = await Promise.all([
    sb.from("tournaments").select("data").eq("id", id).maybeSingle(),
    sb.from("scores").select("match_id, score_a, score_b, pens_a, pens_b").eq("tournament_id", id),
  ]);
  if (tRes.error || !tRes.data) return null;
  const t = tRes.data.data as Tournament;
  applyScores(t, (sRes.data as ScoreRow[]) ?? []);
  return t;
}

/** Losse uitslagen uit de scores-tabel over de blob heen leggen. */
export function applyScores(t: Tournament, rows: ScoreRow[]): void {
  if (rows.length === 0) return;
  const byId = new Map(rows.map((r) => [r.match_id, r]));
  for (const d of t.divisions) {
    for (const m of allMatches(d)) {
      const r = byId.get(m.id);
      if (!r) continue;
      m.scoreA = r.score_a ?? undefined;
      m.scoreB = r.score_b ?? undefined;
      m.pensA = r.pens_a ?? undefined;
      m.pensB = r.pens_b ?? undefined;
    }
  }
}

/** Alleen uitslag-wijzigingen (voor het dashboard van de organisator). */
export function subscribeScores(sb: SupabaseClient, id: string, cb: () => void): () => void {
  const ch = sb
    .channel(`scores-${id}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "scores", filter: `tournament_id=eq.${id}` },
      cb
    )
    .subscribe();
  return () => {
    sb.removeChannel(ch);
  };
}

/** Abonneer op wijzigingen van dit toernooi; cb vuurt bij elke update. */
export function subscribeTournament(sb: SupabaseClient, id: string, cb: () => void): () => void {
  const ch = sb
    .channel(`toernooi-${id}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "scores", filter: `tournament_id=eq.${id}` },
      cb
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "tournaments", filter: `id=eq.${id}` },
      cb
    )
    .subscribe();
  return () => {
    sb.removeChannel(ch);
  };
}

/**
 * Hook voor kijkers en externe invoerders: haalt het toernooi online op en
 * blijft live bijwerken. Valt niet terug op lokale opslag.
 */
export function useCloudTournament(
  id: string | undefined,
  sbUrl: string | null,
  sbKey: string | null
): { t: Tournament | undefined; loading: boolean; error: string | null; refresh: () => void } {
  const [t, setT] = useState<Tournament | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const sbRef = useRef<SupabaseClient | null>(null);

  useEffect(() => {
    if (!id) return;
    const sb = clientFromParams(sbUrl, sbKey);
    sbRef.current = sb;
    if (!sb) {
      setError("Geen verbinding: de link mist de servergegevens.");
      setLoading(false);
      return;
    }
    let alive = true;
    const load = () =>
      fetchCloudTournament(sb, id)
        .then((res) => {
          if (!alive) return;
          setT(res ?? undefined);
          setError(res ? null : "Toernooi niet gevonden (nog niet online gezet?).");
          setLoading(false);
        })
        .catch((e) => {
          if (!alive) return;
          setError(String(e.message ?? e));
          setLoading(false);
        });
    load();
    const off = subscribeTournament(sb, id, load);
    // vangnet: elke 30s verversen voor het geval realtime wegvalt
    const iv = setInterval(load, 30000);
    return () => {
      alive = false;
      off();
      clearInterval(iv);
    };
  }, [id, sbUrl, sbKey, tick]);

  return { t, loading, error, refresh: () => setTick((x) => x + 1) };
}
