/**
 * Vertaal bekende (Supabase-)foutmeldingen naar begrijpelijk Nederlands.
 * Onbekende meldingen gaan ongewijzigd door, zodat er nooit informatie
 * verloren gaat bij het debuggen.
 */
export function nlError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  const known: [RegExp, string][] = [
    [/invalid login credentials/i, "E-mailadres of wachtwoord klopt niet."],
    [/user already registered/i, "Er bestaat al een account met dit e-mailadres — log in."],
    [/email not confirmed/i, "Bevestig eerst je e-mailadres via de mail die je hebt ontvangen."],
    [/password should be at least/i, "Het wachtwoord moet minimaal 6 tekens lang zijn."],
    [/(rate limit|too many requests)/i, "Te veel pogingen achter elkaar — wacht even en probeer het opnieuw."],
    [/(failed to fetch|networkerror|load failed|fetch failed)/i, "Geen verbinding met de server — controleer je internet en probeer het opnieuw."],
    [/(unable to validate email|invalid email)/i, "Dit is geen geldig e-mailadres."],
    [/signup.*disabled/i, "Registreren is op dit moment niet mogelijk."],
  ];
  for (const [re, nl] of known) if (re.test(msg)) return nl;
  return msg;
}
