import { effectiveConfig, getClient } from "./cloud";

/**
 * Reclame afkopen via Mollie (iDEAL). De betaling wordt aangemaakt door een
 * Supabase Edge Function (de Mollie-sleutel blijft server-side); de webhook
 * zet na betaling een rij in ad_buyouts. publish_tournament dwingt de
 * reclamestatus vervolgens server-side af — niet te omzeilen vanuit de client.
 */

export const AD_BUYOUT_PRICE = "€ 10";

export async function startAdBuyout(tournamentId: string, returnUrl: string): Promise<string> {
  const c = effectiveConfig();
  let res: Response;
  try {
    res = await fetch(`${c.url}/functions/v1/create-payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: c.anonKey,
        Authorization: `Bearer ${c.anonKey}`,
      },
      body: JSON.stringify({ tournamentId, returnUrl }),
    });
  } catch {
    throw new Error("Geen verbinding met de betaalserver.");
  }
  const body = await res.json().catch(() => ({}) as { error?: string; checkoutUrl?: string });
  if (!res.ok || !body.checkoutUrl) {
    throw new Error(
      body.error ??
        "Betaling starten mislukt. Is de betaalfunctie al geïnstalleerd op de server? (supabase functions deploy)"
    );
  }
  return body.checkoutUrl as string;
}

/** Is de reclame voor dit toernooi afgekocht? (publiek leesbaar, server is de waarheid) */
export async function isAdFree(tournamentId: string): Promise<boolean> {
  const sb = getClient();
  if (!sb) return false;
  const { data, error } = await sb
    .from("ad_buyouts")
    .select("tournament_id")
    .eq("tournament_id", tournamentId)
    .maybeSingle();
  if (error) return false;
  return !!data;
}
