import type { Division, FormatTemplate, Poule, PouleStage, Stage, Team } from "../types";
import { buildBracket } from "./bracket";
import { buildIndividualStage } from "./individual";
import { uid } from "./id";
import { roundRobin } from "./roundrobin";

export interface FormatInfo {
  key: FormatTemplate;
  title: string;
  description: string;
  icon: string;
}

export const FORMATS: FormatInfo[] = [
  {
    key: "competitie",
    title: "Competitie",
    description: "Eén poule waarin iedereen één keer tegen elkaar speelt. De ranglijst bepaalt de winnaar.",
    icon: "📋",
  },
  {
    key: "roundrobin",
    title: "Round Robin",
    description: "Iedereen speelt twee keer tegen elkaar (uit en thuis), zoals een echte competitie.",
    icon: "🔁",
  },
  {
    key: "wk",
    title: "WK-format",
    description: "Groepsfase in poules, daarna een knock-outfase met de beste teams. Zoals het WK.",
    icon: "🌍",
  },
  {
    key: "championsleague",
    title: "Champions League",
    description: "Poules van 4 teams; de nummers 1 en 2 gaan door naar de knock-outfase.",
    icon: "⭐",
  },
  {
    key: "knockout",
    title: "Knock-out",
    description: "Direct uitschakelen: verliezen is naar huis. Met troostfinale om de 3e plaats.",
    icon: "🏆",
  },
  {
    key: "individueel",
    title: "Individuele winnaar (bijv. 4x4)",
    description: "Spelers loten elke ronde nieuwe teams (bijv. 4 tegen 4). Punten tellen per speler.",
    icon: "🧑‍🤝‍🧑",
  },
];

function makePoules(teams: Team[], pouleCount: number, doubleRR = false): PouleStage {
  const poules: Poule[] = [];
  const letters = "ABCDEFGHIJKLMNOP";
  for (let i = 0; i < pouleCount; i++) {
    poules.push({
      id: uid(),
      name: pouleCount === 1 ? "Poule" : `Poule ${letters[i]}`,
      teamIds: [],
      matches: [],
      doubleRoundRobin: doubleRR,
    });
  }
  teams.forEach((t, i) => poules[i % pouleCount].teamIds.push(t.id));
  for (const p of poules) p.matches = roundRobin(p.teamIds, doubleRR);
  return { id: uid(), type: "poules", name: "Groepsfase", poules };
}

export interface FormatParams {
  pouleCount?: number;
  koSize?: number;
  teamSize?: number; // individueel
  roundsCount?: number; // individueel
}

/** Bouwt de fases (indeling) van een divisie volgens het gekozen format. */
export function buildFormat(d: Division, format: FormatTemplate, params: FormatParams): Stage[] {
  switch (format) {
    case "competitie":
      return [makePoules(d.teams, 1, false)];
    case "roundrobin":
      return [makePoules(d.teams, 1, true)];
    case "wk": {
      const poulesStage = makePoules(d.teams, params.pouleCount ?? 2);
      const ko = buildBracket(params.koSize ?? 4, poulesStage.poules);
      return [poulesStage, ko];
    }
    case "championsleague": {
      const pouleCount = Math.max(1, Math.ceil(d.teams.length / 4));
      const poulesStage = makePoules(d.teams, pouleCount);
      const koSize = params.koSize ?? nextPowerOfTwo(pouleCount * 2);
      const ko = buildBracket(koSize, poulesStage.poules);
      return [poulesStage, ko];
    }
    case "knockout":
      return [buildBracket(params.koSize ?? nextPowerOfTwo(d.teams.length), [], true)];
    case "individueel":
      return [
        buildIndividualStage(d.players, params.teamSize ?? 4, params.roundsCount ?? 5),
      ];
  }
}

export function nextPowerOfTwo(n: number): number {
  let p = 2;
  while (p < n) p *= 2;
  return Math.min(p, 32);
}

/** Vult tbd-slots van een pure knock-out met de teams van de divisie. */
export function seedKnockoutWithTeams(stage: Stage, d: Division): void {
  if (stage.type !== "bracket") return;
  stage.started = true; // geen poulefase ervoor, dus direct van start
  const first = stage.rounds[0];
  let ti = 0;
  for (const m of first.matches) {
    if (m.a.kind === "tbd" && ti < d.teams.length) m.a = { kind: "team", teamId: d.teams[ti++].id };
    if (m.b.kind === "tbd" && ti < d.teams.length) m.b = { kind: "team", teamId: d.teams[ti++].id };
  }
}
