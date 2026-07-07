import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Tournament } from "./types";
import { defaultPresentation, defaultScoring } from "./types";
import { uid } from "./logic/id";

interface AppState {
  tournaments: Tournament[];
  createTournament: (name: string, days: string[], locations: string[], divisions: string[], esport: boolean) => string;
  updateTournament: (id: string, fn: (t: Tournament) => void) => void;
  deleteTournament: (id: string) => void;
}

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      tournaments: [],
      createTournament: (name, days, locations, divisionNames, esport) => {
        const id = uid();
        const t: Tournament = {
          id,
          name,
          createdAt: new Date().toISOString(),
          days,
          locations,
          esport,
          divisions: (divisionNames.length ? divisionNames : ["Divisie 1"]).map((n) => ({
            id: uid(),
            name: n,
            teams: [],
            players: [],
            individualMode: false,
            stages: [],
          })),
          sport: "Voetbal",
          scoring: defaultScoring(),
          fields: [],
          referees: [],
          admins: [],
          matchDuration: 15,
          breakBetween: 5,
          startTime: "09:00",
          presentation: defaultPresentation(),
        };
        set({ tournaments: [...get().tournaments, t] });
        return id;
      },
      updateTournament: (id, fn) =>
        set({
          tournaments: get().tournaments.map((t) => {
            if (t.id !== id) return t;
            const copy: Tournament = JSON.parse(JSON.stringify(t));
            fn(copy);
            return copy;
          }),
        }),
      deleteTournament: (id) => set({ tournaments: get().tournaments.filter((t) => t.id !== id) }),
    }),
    { name: "toernooitje" }
  )
);

export function useTournament(id: string | undefined): Tournament | undefined {
  return useApp((s) => s.tournaments.find((t) => t.id === id));
}
