// Supabase Edge Function: start een Mollie-betaling voor het afkopen van
// reclame. De Mollie API-sleutel blijft server-side (secret MOLLIE_API_KEY).
//
// Deployen:
//   supabase functions deploy create-payment --no-verify-jwt
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
};

const PRICE = "10.00"; // EUR, eenmalig per toernooi

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Alleen POST" }, 405);

  try {
    const { tournamentId, returnUrl } = await req.json();
    if (typeof tournamentId !== "string" || typeof returnUrl !== "string" || !tournamentId || !returnUrl) {
      return json({ error: "tournamentId en returnUrl zijn verplicht" }, 400);
    }

    const mollieKey = Deno.env.get("MOLLIE_API_KEY");
    if (!mollieKey) return json({ error: "MOLLIE_API_KEY is nog niet ingesteld op de server" }, 500);

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // alleen betalen voor een toernooi dat echt online staat
    const { data: t } = await sb.from("tournaments").select("id").eq("id", tournamentId).maybeSingle();
    if (!t) return json({ error: "Toernooi niet gevonden — zet het eerst live" }, 404);

    const { data: existing } = await sb
      .from("ad_buyouts")
      .select("tournament_id")
      .eq("tournament_id", tournamentId)
      .maybeSingle();
    if (existing) return json({ error: "De reclame is voor dit toernooi al afgekocht" }, 409);

    const res = await fetch("https://api.mollie.com/v2/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mollieKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: { currency: "EUR", value: PRICE },
        description: `Toernooitje — reclame afkopen (toernooi ${tournamentId})`,
        redirectUrl: returnUrl,
        webhookUrl: `${Deno.env.get("SUPABASE_URL")}/functions/v1/payment-webhook`,
        metadata: { tournamentId },
      }),
    });
    const payment = await res.json();
    if (!res.ok) {
      console.error("Mollie-fout:", payment);
      return json({ error: payment.detail ?? "Betaling aanmaken mislukt bij Mollie" }, 502);
    }

    await sb.from("payments").insert({
      id: payment.id,
      tournament_id: tournamentId,
      status: payment.status,
      amount: Number(PRICE),
    });

    return json({ checkoutUrl: payment._links.checkout.href });
  } catch (e) {
    console.error(e);
    return json({ error: "Onverwachte serverfout" }, 500);
  }
});
