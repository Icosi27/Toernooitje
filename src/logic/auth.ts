import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getClient } from "./cloud";

/**
 * Accounts voor organisatoren via Supabase Auth (e-mail + wachtwoord).
 * Toernooien blijven daarnaast lokaal werken: een account is nodig om later
 * op meerdere apparaten bij je toernooien te kunnen, niet om te beginnen.
 */

export function useSession(): Session | null | undefined {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    const sb = getClient();
    if (!sb) {
      setSession(null);
      return;
    }
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = sb.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);
  return session;
}

const MESSAGES: [RegExp, string][] = [
  [/invalid login credentials/i, "Onjuist e-mailadres of wachtwoord."],
  [/user already registered/i, "Er bestaat al een account met dit e-mailadres."],
  [/password should be at least/i, "Het wachtwoord moet minimaal 6 tekens zijn."],
  [/email not confirmed/i, "Bevestig eerst je e-mailadres via de mail die we je stuurden."],
  [/rate limit/i, "Te veel pogingen — probeer het over een minuut opnieuw."],
  [/valid email/i, "Vul een geldig e-mailadres in."],
];

function vertaal(msg: string): string {
  for (const [re, nl] of MESSAGES) if (re.test(msg)) return nl;
  return msg;
}

export async function signUp(
  email: string,
  password: string,
  name: string
): Promise<{ needsConfirmation: boolean }> {
  const sb = getClient();
  if (!sb) throw new Error("Geen verbinding met de server.");
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) throw new Error(vertaal(error.message));
  return { needsConfirmation: !data.session };
}

export async function signIn(email: string, password: string): Promise<void> {
  const sb = getClient();
  if (!sb) throw new Error("Geen verbinding met de server.");
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw new Error(vertaal(error.message));
}

export async function signOut(): Promise<void> {
  await getClient()?.auth.signOut();
}

export async function resetPassword(email: string): Promise<void> {
  const sb = getClient();
  if (!sb) throw new Error("Geen verbinding met de server.");
  const { error } = await sb.auth.resetPasswordForEmail(email);
  if (error) throw new Error(vertaal(error.message));
}
