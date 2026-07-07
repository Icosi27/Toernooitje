import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import type { Tournament } from "../types";

/**
 * Deellink: het hele toernooi wordt gecomprimeerd in de URL gestopt, zodat
 * deelnemers de standen kunnen bekijken zonder server. Afbeeldingen (logo's,
 * achtergrond, sponsors) worden weggelaten om de link kort te houden.
 * Let op: het is een momentopname — na nieuwe uitslagen deel je de link opnieuw.
 */
export function encodeShare(t: Tournament): string {
  const slim: Tournament = JSON.parse(JSON.stringify(t));
  slim.presentation.logo = undefined;
  slim.presentation.background = undefined;
  slim.presentation.sponsors = [];
  for (const d of slim.divisions) for (const team of d.teams) team.logo = undefined;
  return compressToEncodedURIComponent(JSON.stringify(slim));
}

export function decodeShare(data: string): Tournament | null {
  try {
    const json = decompressFromEncodedURIComponent(data);
    if (!json) return null;
    const t = JSON.parse(json) as Tournament;
    return t && t.id && t.divisions ? t : null;
  } catch {
    return null;
  }
}

/** Absolute app-URL voor een interne route (werkt met de hash-router). */
export function appUrl(route: string): string {
  return `${window.location.origin}${window.location.pathname}#${route}`;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}
