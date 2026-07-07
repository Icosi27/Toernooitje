import type { Tournament } from "../types";
import { getClient } from "./cloud";
import { useApp } from "../store";

/**
 * Koppeling account <-> toernooien. Ingelogde organisatoren krijgen een
 * automatische back-up van hun volledige toernooi (incl. schrijfsleutel) in
 * de RLS-afgeschermde tabel account_tournaments, en kunnen die op elk ander
 * apparaat weer ophalen om verder te werken.
 */

export interface AccountRow {
  tournament_id: string;
  write_key: string | null;
  data: Tournament;
  updated_at: string;
}

export async function saveTournamentToAccount(t: Tournament, userId: string): Promise<void> {
  const sb = getClient();
  if (!sb) return;
  const { error } = await sb.from("account_tournaments").upsert({
    user_id: userId,
    tournament_id: t.id,
    write_key: t.cloud?.writeKey ?? null,
    data: t,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

export async function listAccountTournaments(): Promise<AccountRow[]> {
  const sb = getClient();
  if (!sb) return [];
  const { data, error } = await sb
    .from("account_tournaments")
    .select("tournament_id, write_key, data, updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as AccountRow[]) ?? [];
}

export async function removeTournamentFromAccount(tournamentId: string): Promise<void> {
  const sb = getClient();
  if (!sb) return;
  const { error } = await sb.from("account_tournaments").delete().eq("tournament_id", tournamentId);
  if (error) throw new Error(error.message);
}

/** Zet een account-toernooi op dit apparaat (of ververs de lokale versie). */
export function pullToDevice(row: AccountRow): void {
  const t: Tournament = JSON.parse(JSON.stringify(row.data));
  // schrijfsleutel herstellen zodat dit apparaat ook mag publiceren
  if (row.write_key) {
    t.cloud = { online: t.cloud?.online ?? true, writeKey: row.write_key };
  }
  const s = useApp.getState();
  if (s.tournaments.some((x) => x.id === t.id)) {
    s.updateTournament(t.id, (x) => Object.assign(x, t));
  } else {
    useApp.setState({ tournaments: [...s.tournaments, t] });
  }
}
