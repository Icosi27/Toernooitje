// Supabase Edge Function: Mollie meldt hier statuswijzigingen van betalingen.
// We vertrouwen nooit de melding zelf: we halen de status altijd zelf op bij
// Mollie (met de geheime sleutel) voordat we iets vrijgeven.
//
// Deployen:
//   supabase functions deploy payment-webhook --no-verify-jwt
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Alleen POST", { status: 405 });

  try {
    const form = await req.formData();
    const id = form.get("id");
    if (typeof id !== "string" || !id.startsWith("tr_")) {
      return new Response("Ongeldige melding", { status: 400 });
    }

    const res = await fetch(`https://api.mollie.com/v2/payments/${id}`, {
      headers: { Authorization: `Bearer ${Deno.env.get("MOLLIE_API_KEY")}` },
    });
    if (!res.ok) return new Response("Betaling niet gevonden", { status: 404 });
    const payment = await res.json();
    const tournamentId = payment.metadata?.tournamentId;

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await sb.from("payments").upsert({
      id: payment.id,
      tournament_id: tournamentId ?? "onbekend",
      status: payment.status,
      amount: Number(payment.amount?.value ?? 0),
    });

    if (payment.status === "paid" && typeof tournamentId === "string" && tournamentId) {
      await sb.from("ad_buyouts").upsert({
        tournament_id: tournamentId,
        payment_id: payment.id,
        amount: Number(payment.amount?.value ?? 0),
      });
    }

    // Mollie verwacht een 200, anders blijft hij opnieuw proberen
    return new Response("ok");
  } catch (e) {
    console.error(e);
    return new Response("Serverfout", { status: 500 });
  }
});
