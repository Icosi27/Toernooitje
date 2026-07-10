import { useState } from "react";
import { Link } from "react-router-dom";
import type { Tournament } from "../types";
import { allMatches } from "../logic/resolve";

interface Step {
  key: string;
  nr: number;
  label: string;
  to: string;
  hint: string;
}

const TOTAL_STEPS = 4;

/**
 * De natuurlijke route door het dashboard: deelnemers → indeling → schema →
 * live zetten. Geeft de eerstvolgende onvoltooide stap terug, of null als de
 * organisator klaar is voor de toernooidag.
 */
export function nextStep(t: Tournament): Step | null {
  const hasParticipants = t.divisions.some((d) =>
    d.individualMode ? d.players.length > 0 : d.teams.length > 0
  );
  if (!hasParticipants)
    return {
      key: "deelnemers",
      nr: 1,
      label: "Voeg deelnemers toe",
      to: "deelnemers",
      hint: "Zet je teams of spelers erin — handmatig, in bulk of via de inschrijflink.",
    };
  if (!t.divisions.some((d) => d.stages.length > 0))
    return {
      key: "indeling",
      nr: 2,
      label: "Kies een indeling",
      to: "indeling",
      hint: "Poules, WK-format of knock-out — per divisie in één klik.",
    };
  const anyScheduled = t.divisions.some((d) => allMatches(d).some((m) => m.start));
  if (!anyScheduled)
    return {
      key: "schema",
      nr: 3,
      label: "Plan het schema",
      to: "schema",
      hint: "Voeg velden toe en laat de wedstrijden automatisch inplannen.",
    };
  if (!t.cloud?.online)
    return {
      key: "live",
      nr: 4,
      label: "Zet het toernooi live",
      to: "presentatie",
      hint: "Dan volgt iedereen de standen op zijn eigen telefoon en voeren scheidsrechters zelf uitslagen in.",
    };
  return null;
}

/** Compacte "volgende stap"-balk bovenaan elke dashboard-tab. */
export function NextStepBanner({ t }: { t: Tournament }) {
  const step = nextStep(t);
  const dismissKey = step ? `toernooitje-step-weg-${t.id}-${step.key}` : "";
  const [dismissed, setDismissed] = useState(false);
  if (!step) return null;
  if (dismissed || localStorage.getItem(dismissKey)) return null;

  return (
    <div className="mb-5 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm">
      <span
        className="rounded-full px-2.5 py-0.5 text-xs font-bold"
        style={{ background: "var(--accent)", color: "var(--accent-text)" }}
      >
        Stap {step.nr}/{TOTAL_STEPS}
      </span>
      <div className="min-w-0 flex-1">
        <b>{step.label}.</b> <span className="text-slate-500">{step.hint}</span>
      </div>
      <Link to={`/t/${t.id}/${step.to}`} className="btn-outline shrink-0 px-3 py-1.5 text-xs">
        Ga ernaartoe →
      </Link>
      <button
        className="cursor-pointer text-slate-300 hover:text-slate-500"
        title="Verberg deze tip"
        onClick={() => {
          localStorage.setItem(dismissKey, "1");
          setDismissed(true);
        }}
      >
        ✕
      </button>
    </div>
  );
}
