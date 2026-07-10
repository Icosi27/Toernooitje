import type { Division, Tournament } from "../types";
import { podium } from "../logic/podium";
import { TeamBadge } from "./TeamBadge";
import { Confetti } from "./decor";

const MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
const BLOCK_HEIGHT: Record<number, string> = { 1: "h-24", 2: "h-16", 3: "h-12" };

/**
 * Eindklassement als echt getrapt podium (2-1-3) in stadionstijl — de
 * eindfoto van het toernooi, óók voor wie geen kampioen werd. Met myTeam
 * krijgt het volgende team een persoonlijke felicitatieregel.
 */
export function PodiumCard({ t, d, myTeam }: { t: Tournament; d: Division; myTeam?: string }) {
  const result = podium(d, t.scoring);
  if (!result) return null;
  const teamOf = (id: string) => d.teams.find((tm) => tm.id === id);
  const top = result.filter((r) => r.place <= 3);
  const rest = result.filter((r) => r.place > 3);
  const byPlace = (p: number) => top.find((r) => r.place === p);
  const myPlace = myTeam ? result.find((r) => r.teamId === myTeam)?.place : undefined;

  return (
    <div className="card-stadium fade-in">
      <Confetti count={10} once />
      <div className="relative">
        <div className="mb-4 text-center text-xs font-bold uppercase tracking-widest text-white/70">
          🏆 Eindklassement{t.divisions.length > 1 ? ` ${d.name}` : ""}
        </div>
        <div className="flex items-end justify-center gap-2 sm:gap-4">
          {[2, 1, 3].map((place) => {
            const entry = byPlace(place);
            if (!entry) return null;
            const team = teamOf(entry.teamId);
            return (
              <div key={place} className="flex w-24 flex-col items-center gap-1.5 sm:w-32">
                <TeamBadge team={team} size={place === 1 ? 48 : 36} />
                <span
                  className={`max-w-full truncate text-center font-bold ${place === 1 ? "text-base sm:text-lg" : "text-sm"}`}
                  title={team?.name}
                >
                  {team?.name ?? "?"}
                </span>
                <div
                  className={`flex w-full items-start justify-center rounded-t-lg bg-white/15 pt-1.5 text-2xl ${BLOCK_HEIGHT[place]}`}
                >
                  {MEDALS[place]}
                </div>
              </div>
            );
          })}
        </div>
        {myPlace !== undefined && (
          <div className="mt-4 rounded-lg bg-white/10 px-3 py-2 text-center text-sm font-semibold">
            {myPlace === 1
              ? "Jullie zijn kampioen! 🏆"
              : myPlace <= 3
                ? `Jullie zijn ${myPlace}e geworden! ${MEDALS[myPlace]}`
                : `Jullie zijn ${myPlace}e geworden — bedankt voor vandaag. 👏`}
          </div>
        )}
        {rest.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-0.5 text-sm text-white/80">
            {rest.map((r) => (
              <div key={r.teamId} className="flex items-center gap-2">
                <span className="w-5 shrink-0 text-right text-xs text-white/50">{r.place}.</span>
                <TeamBadge team={teamOf(r.teamId)} size={14} />
                <span className="truncate">{teamOf(r.teamId)?.name ?? "?"}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
