import type { Tournament } from "../types";

export interface RegistrationState {
  open: boolean;
  reason: "open" | "dicht" | "vol" | "verlopen";
}

/**
 * Is de inschrijving effectief open? De organisator hoeft de toggle niet te
 * bewaken: een maximum aantal teams of een sluitdatum sluit de inschrijving
 * vanzelf. publicView() publiceert de effectieve status, zodat ook de
 * inschrijfpagina op andere telefoons (waar de inschrijvingen zelf niet
 * zichtbaar zijn) gewoon dichtgaat.
 */
export function registrationState(t: Tournament): RegistrationState {
  if (!t.registrationOpen) return { open: false, reason: "dicht" };
  if (t.registrationDeadline) {
    const today = new Date().toISOString().slice(0, 10);
    if (today > t.registrationDeadline) return { open: false, reason: "verlopen" };
  }
  if (t.registrationLimit && t.registrationLimit > 0) {
    const count = (t.registrations ?? []).filter((r) => r.status !== "afgewezen").length;
    if (count >= t.registrationLimit) return { open: false, reason: "vol" };
  }
  return { open: true, reason: "open" };
}
