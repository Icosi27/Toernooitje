import type { Division, Tournament } from "../types";
import { podium } from "../logic/podium";
import { TeamBadge } from "./TeamBadge";

const MEDALS = ["🥇", "🥈", "🥉"];

/**
 * Eindklassement van een divisie, zodra dat vaststaat: het podium groot,
 * de rest van de eindstand (bij een competitie) compact eronder.
 */
export function PodiumCard({ t, d }: { t: Tournament; d: Division }) {
  const result = podium(d, t.scoring);
  if (!result) return null;
  const teamOf = (id: string) => d.teams.find((tm) => tm.id === id);
  const top = result.filter((r) => r.place <= 3);
  const rest = result.filter((r) => r.place > 3);

  return (
    <div className="card fade-in overflow-hidden">
      <div
        className="px-4 py-1.5 text-xs font-bold uppercase tracking-wide"
        style={{ background: "var(--accent)", color: "var(--accent-text)" }}
      >
        🏆 Eindklassement{t.divisions.length > 1 ? ` ${d.name}` : ""}
      </div>
      <div className="divide-y divide-slate-100">
        {top.map((r, i) => {
          const team = teamOf(r.teamId);
          return (
            <div key={r.teamId} className="flex items-center gap-3 px-4 py-2.5">
              <span className="text-2xl">{MEDALS[i] ?? r.place}</span>
              <TeamBadge team={team} size={24} />
              <span className={`truncate ${r.place === 1 ? "text-lg font-black" : "font-semibold"}`}>
                {team?.name ?? "?"}
              </span>
            </div>
          );
        })}
        {rest.length > 0 && (
          <div className="px-4 py-2 text-sm text-slate-500">
            {rest.map((r) => (
              <div key={r.teamId} className="flex items-center gap-2 py-0.5">
                <span className="w-6 text-right text-xs text-slate-400">{r.place}.</span>
                <TeamBadge team={teamOf(r.teamId)} size={16} />
                <span className="truncate">{teamOf(r.teamId)?.name ?? "?"}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
