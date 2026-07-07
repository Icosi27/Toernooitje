import type { MapBlock, Tournament } from "../types";
import { uid } from "./id";

/**
 * Splitst een fysiek veld in 2 of 4 speelveldjes — voor 7x7 (helften) of
 * 4x4 (kwarten). Elk deel is daarna een eigen beplanbaar veld met een eigen
 * programmakolom. Het originele veld wordt deel "A" en behoudt zijn id, dus
 * al geplande wedstrijden en scheidsrechter-voorkeuren blijven kloppen.
 * Staat het veld op de plattegrond, dan wordt het blok in gelijke delen
 * opgedeeld.
 */
export function splitField(t: Tournament, fieldId: string, parts: 2 | 4): void {
  const idx = t.fields.findIndex((f) => f.id === fieldId);
  if (idx < 0) return;
  const orig = t.fields[idx];
  const letters = ["A", "B", "C", "D"];
  const baseName = orig.name;
  const subIds = [orig.id, ...Array.from({ length: parts - 1 }, () => uid())];

  orig.name = `${baseName} ${letters[0]}`;
  const extra = subIds.slice(1).map((id, i) => ({
    id,
    name: `${baseName} ${letters[i + 1]}`,
    startTime: orig.startTime,
    location: orig.location,
  }));
  t.fields.splice(idx + 1, 0, ...extra);

  // een scheidsrechter met voorkeur voor het hele veld mag op alle delen fluiten
  for (const r of t.referees) {
    if (r.fieldIds?.includes(orig.id)) r.fieldIds = [...r.fieldIds, ...subIds.slice(1)];
  }

  // plattegrond: het veldblok in gelijke delen knippen
  const blocks = t.venueMap?.blocks;
  if (!blocks) return;
  const bi = blocks.findIndex((b) => b.kind === "field" && b.fieldId === orig.id);
  if (bi < 0) return;
  const b = blocks[bi];
  const halves = (r: Pick<MapBlock, "x" | "y" | "w" | "h">) =>
    r.w >= r.h
      ? [
          { x: r.x, y: r.y, w: r.w / 2, h: r.h },
          { x: r.x + r.w / 2, y: r.y, w: r.w / 2, h: r.h },
        ]
      : [
          { x: r.x, y: r.y, w: r.w, h: r.h / 2 },
          { x: r.x, y: r.y + r.h / 2, w: r.w, h: r.h / 2 },
        ];
  const cells = parts === 2 ? halves(b) : halves(b).flatMap((h) => halves(h));
  const newBlocks: MapBlock[] = cells.map((c, i) => ({
    id: i === 0 ? b.id : uid(),
    kind: "field",
    fieldId: subIds[i],
    ...c,
  }));
  blocks.splice(bi, 1, ...newBlocks);
}
