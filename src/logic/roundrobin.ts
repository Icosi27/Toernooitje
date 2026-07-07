import type { ID, Match } from "../types";
import { uid } from "./id";

/**
 * Round-robin volgens de cirkelmethode: iedereen speelt één keer tegen iedereen,
 * netjes verdeeld over speelrondes. Bij `double` ook de returns (uit/thuis gewisseld).
 */
export function roundRobin(teamIds: ID[], double = false): Match[] {
  const ids = [...teamIds];
  if (ids.length < 2) return [];
  const bye = ids.length % 2 === 1;
  if (bye) ids.push("__bye__");
  const n = ids.length;
  const roundsCount = n - 1;
  const half = n / 2;
  const matches: Match[] = [];
  const arr = [...ids];

  for (let r = 0; r < roundsCount; r++) {
    for (let i = 0; i < half; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      if (a === "__bye__" || b === "__bye__") continue;
      // wissel thuis/uit per ronde voor eerlijkheid
      const home = r % 2 === 0 ? a : b;
      const away = r % 2 === 0 ? b : a;
      matches.push({
        id: uid(),
        a: { kind: "team", teamId: home },
        b: { kind: "team", teamId: away },
        round: r + 1,
      });
    }
    // roteer: eerste blijft staan
    arr.splice(1, 0, arr.pop()!);
  }

  if (double) {
    const returns: Match[] = matches.map((m) => ({
      id: uid(),
      a: m.b,
      b: m.a,
      round: (m.round ?? 0) + roundsCount,
    }));
    matches.push(...returns);
  }
  return matches;
}
