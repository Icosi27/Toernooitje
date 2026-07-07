import type { BracketStage, Match, Poule, Slot } from "../types";
import { uid } from "./id";

export function roundName(teamsInRound: number): string {
  switch (teamsInRound) {
    case 2:
      return "Finale";
    case 4:
      return "Halve finale";
    case 8:
      return "Kwartfinale";
    case 16:
      return "Achtste finale";
    default:
      return `Ronde van ${teamsInRound}`;
  }
}

/**
 * Maakt een knock-out bracket van `size` teams. Als er poules zijn, worden de
 * eerste slots gevuld met poule-plaatsingen (kruislings: A1-B2, B1-A2, ...),
 * anders blijven het tbd-slots die de organisator zelf kan invullen.
 */
export function buildBracket(size: number, poules: Poule[], thirdPlace = true): BracketStage {
  const stage: BracketStage = {
    id: uid(),
    type: "bracket",
    name: "Knock-outfase",
    size,
    rounds: [],
    thirdPlace,
  };

  const firstSlots: Slot[] = seedSlots(size, poules);

  let current: Match[] = [];
  for (let i = 0; i < size / 2; i++) {
    current.push({
      id: uid(),
      a: firstSlots[i * 2],
      b: firstSlots[i * 2 + 1],
      round: 1,
      label: `${roundName(size)} ${size > 2 ? i + 1 : ""}`.trim(),
    });
  }
  stage.rounds.push({ name: roundName(size), matches: current });

  let teams = size / 2;
  let r = 2;
  while (teams >= 2) {
    const next: Match[] = [];
    for (let i = 0; i < teams / 2; i++) {
      next.push({
        id: uid(),
        a: { kind: "winner", matchId: current[i * 2].id },
        b: { kind: "winner", matchId: current[i * 2 + 1].id },
        round: r,
        label: `${roundName(teams)} ${teams > 2 ? i + 1 : ""}`.trim(),
      });
    }
    stage.rounds.push({ name: roundName(teams), matches: next });
    current = next;
    teams = teams / 2;
    r++;
  }

  if (thirdPlace && size >= 4) {
    const semis = stage.rounds[stage.rounds.length - 2].matches;
    stage.rounds.splice(stage.rounds.length - 1, 0, {
      name: "Troostfinale",
      matches: [
        {
          id: uid(),
          a: { kind: "loser", matchId: semis[0].id },
          b: { kind: "loser", matchId: semis[1].id },
          round: r - 1,
          label: "Om de 3e plaats",
        },
      ],
    });
  }
  return stage;
}

/**
 * Kruislingse seeding uit poules: 1e poule A tegen 2e poule B enz.
 * Werkt voor de gangbare gevallen (bijv. 4 poules -> KO met 8: A1-B2, B1-A2, C1-D2, D1-C2).
 */
function seedSlots(size: number, poules: Poule[]): Slot[] {
  const slots: Slot[] = [];
  if (poules.length === 0) {
    for (let i = 0; i < size; i++) slots.push({ kind: "tbd" });
    return slots;
  }
  const perPoule = Math.max(1, Math.floor(size / poules.length));
  const qualifiers: { pouleIdx: number; rank: number }[] = [];
  for (let rank = 1; rank <= perPoule; rank++) {
    for (let p = 0; p < poules.length; p++) qualifiers.push({ pouleIdx: p, rank });
  }
  // vul aan met beste nummers {perPoule+1} als de bracket groter is
  let extraRank = perPoule + 1;
  while (qualifiers.length < size && extraRank <= 8) {
    for (let p = 0; p < poules.length && qualifiers.length < size; p++) {
      qualifiers.push({ pouleIdx: p, rank: extraRank });
    }
    extraRank++;
  }

  // kruislings paren: winnaar poule X tegen nummer 2 van poule X+1
  const used = new Set<number>();
  const pairs: [number, number][] = [];
  for (let i = 0; i < qualifiers.length; i++) {
    if (used.has(i)) continue;
    used.add(i);
    const q = qualifiers[i];
    // zoek tegenstander: andere poule, andere rank
    let oppIdx = -1;
    for (let j = qualifiers.length - 1; j >= 0; j--) {
      if (used.has(j)) continue;
      const o = qualifiers[j];
      if (o.pouleIdx !== q.pouleIdx && o.rank !== q.rank) {
        oppIdx = j;
        break;
      }
    }
    if (oppIdx === -1) {
      for (let j = qualifiers.length - 1; j >= 0; j--) {
        if (!used.has(j)) {
          oppIdx = j;
          break;
        }
      }
    }
    if (oppIdx !== -1) {
      used.add(oppIdx);
      pairs.push([i, oppIdx]);
    } else {
      pairs.push([i, -1]);
    }
  }

  for (const [i, j] of pairs.slice(0, size / 2)) {
    const qa = qualifiers[i];
    slots.push({ kind: "pouleRank", pouleId: poules[qa.pouleIdx].id, rank: qa.rank });
    if (j >= 0) {
      const qb = qualifiers[j];
      slots.push({ kind: "pouleRank", pouleId: poules[qb.pouleIdx].id, rank: qb.rank });
    } else {
      slots.push({ kind: "tbd" });
    }
  }
  while (slots.length < size) slots.push({ kind: "tbd" });
  return slots;
}
