import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Tournament } from "./types";
import { defaultPresentation, defaultScoring } from "./types";
import { uid } from "./logic/id";

/**
 * localStorage kan vol raken (base64-logo's tellen hard aan tegen de ~5MB-quota).
 * zustand-persist faalt dan stil; deze vlag maakt dat zichtbaar in de UI.
 */
interface StorageHealth {
  full: boolean;
  setFull: (v: boolean) => void;
}

export const useStorageHealth = create<StorageHealth>((set) => ({
  full: false,
  setFull: (v) => set({ full: v }),
}));

const guardedStorage = {
  getItem: (name: string) => localStorage.getItem(name),
  setItem: (name: string, value: string) => {
    try {
      localStorage.setItem(name, value);
      if (useStorageHealth.getState().full) useStorageHealth.getState().setFull(false);
    } catch {
      useStorageHealth.getState().setFull(true);
    }
  },
  removeItem: (name: string) => localStorage.removeItem(name),
};

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
    { name: "toernooitje", storage: createJSONStorage(() => guardedStorage) }
  )
);

export function useTournament(id: string | undefined): Tournament | undefined {
  return useApp((s) => s.tournaments.find((t) => t.id === id));
}
