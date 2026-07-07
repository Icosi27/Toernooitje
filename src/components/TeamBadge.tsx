import type { Team } from "../types";

/** Tenue-icoontje: shirt + broekje in de clubkleuren. */
export function KitIcon({
  shirt = "#94a3b8",
  shorts = "#e2e8f0",
  size = 20,
}: {
  shirt?: string;
  shorts?: string;
  size?: number;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="shrink-0">
      {/* shirt */}
      <path
        d="M8 2 L4 4.5 L5.5 8 L7 7.2 V13 H17 V7.2 L18.5 8 L20 4.5 L16 2 C15 3.2 13.6 3.8 12 3.8 C10.4 3.8 9 3.2 8 2 Z"
        fill={shirt}
        stroke="rgba(0,0,0,.25)"
        strokeWidth="0.6"
      />
      {/* broekje */}
      <path
        d="M7 14.5 H17 L18 21 H13.5 L12 17.5 L10.5 21 H6 Z"
        fill={shorts}
        stroke="rgba(0,0,0,.25)"
        strokeWidth="0.6"
      />
    </svg>
  );
}

/**
 * Team-embleem voor in lijsten en standen: het logo als dat er is, anders het
 * tenue in de clubkleuren, anders niets.
 */
export function TeamBadge({ team, size = 20 }: { team?: Team | null; size?: number }) {
  if (!team) return null;
  if (team.logo)
    return (
      <img
        src={team.logo}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-sm object-contain"
        style={{ width: size, height: size }}
      />
    );
  if (team.shirtColor || team.shortsColor)
    return <KitIcon shirt={team.shirtColor} shorts={team.shortsColor} size={size} />;
  return null;
}
