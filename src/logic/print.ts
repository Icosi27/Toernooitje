import type { Tournament } from "../types";
import { scheduledMatches } from "./schedule";
import { addMinutes } from "./schedule";
import { pouleStandings } from "./standings";
import { slotLabel } from "./resolve";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Printvriendelijk overzicht (schema en/of standen) in een eigen venster:
 * sporthallen hebben slechte wifi en een prikbord — papier blijft koning op
 * de wedstrijdtafel. Bewust een kale HTML-pagina met eigen CSS, zodat de
 * app-opmaak (navigatie, knoppen, accentkleuren) nooit mee-print.
 */
export function printOverview(
  t: Tournament,
  opts: { schema?: boolean; standen?: boolean } = { schema: true, standen: true }
): void {
  const fieldName = (id?: string) => t.fields.find((f) => f.id === id)?.name ?? "";
  const refName = (id?: string) =>
    t.referees.find((r) => r.id === id)?.name ??
    t.divisions.flatMap((d) => d.teams).find((tm) => tm.id === id)?.name ??
    "";

  let body = `<h1>${esc(t.name)}</h1><p class="sub">${esc(t.days.join(" · "))}${
    t.locations.length ? " · " + esc(t.locations.join(", ")) : ""
  }</p>`;

  if (opts.standen) {
    for (const d of t.divisions) {
      const poules = d.stages.filter((s) => s.type === "poules").flatMap((s) => s.poules);
      if (poules.length === 0) continue;
      body += `<h2>Standen${t.divisions.length > 1 ? ` — ${esc(d.name)}` : ""}</h2><div class="grid">`;
      for (const p of poules) {
        const rows = pouleStandings(p, t.scoring)
          .map(
            (r, i) =>
              `<tr><td>${i + 1}</td><td class="l">${esc(
                d.teams.find((tm) => tm.id === r.teamId)?.name ?? "?"
              )}</td><td>${r.played}</td><td>${r.goalDiff > 0 ? "+" : ""}${r.goalDiff}</td><td><b>${r.points}</b></td></tr>`
          )
          .join("");
        body += `<table><caption>${esc(p.name)}</caption><thead><tr><th>#</th><th class="l">Team</th><th>G</th><th>DS</th><th>P</th></tr></thead><tbody>${rows}</tbody></table>`;
      }
      body += `</div>`;
    }
  }

  if (opts.schema) {
    const rows = scheduledMatches(t).filter((r) => r.match.start);
    if (rows.length > 0) {
      const anyRef = rows.some((r) => r.match.refereeId || r.match.refereeTeamId);
      body += `<h2>Speelschema</h2><table class="schema"><thead><tr><th>Tijd</th><th>Veld</th><th class="l">Wedstrijd</th>${
        anyRef ? '<th class="l">Scheids</th>' : ""
      }<th>Uitslag</th></tr></thead><tbody>`;
      for (const { match: m, division: d } of rows) {
        const uitslag =
          m.scoreA !== undefined && m.scoreB !== undefined ? `${m.scoreA} – ${m.scoreB}` : "____ – ____";
        body += `<tr><td>${m.start}–${addMinutes(m.start!, t.matchDuration)}</td><td>${esc(
          fieldName(m.fieldId)
        )}</td><td class="l">${esc(slotLabel(m.a, d, t.scoring))} — ${esc(slotLabel(m.b, d, t.scoring))}${
          t.divisions.length > 1 ? ` <span class="dim">(${esc(d.name)})</span>` : ""
        }</td>${anyRef ? `<td class="l">${esc(refName(m.refereeId ?? m.refereeTeamId))}</td>` : ""}<td>${uitslag}</td></tr>`;
      }
      body += `</tbody></table>`;
    }
  }

  const html = `<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>${esc(t.name)}</title><style>
    body { font: 12px/1.45 "Segoe UI", Arial, sans-serif; color: #111; margin: 24px; }
    h1 { font-size: 20px; margin: 0 0 2px; }
    .sub { color: #555; margin: 0 0 16px; }
    h2 { font-size: 14px; margin: 18px 0 8px; border-bottom: 1px solid #999; padding-bottom: 3px; }
    .grid { display: flex; flex-wrap: wrap; gap: 14px; }
    table { border-collapse: collapse; page-break-inside: avoid; }
    caption { text-align: left; font-weight: bold; padding-bottom: 3px; }
    th, td { border: 1px solid #ccc; padding: 3px 8px; text-align: center; }
    th { background: #f0f0f0; font-size: 11px; text-transform: uppercase; }
    .l { text-align: left; }
    .schema { width: 100%; }
    .dim { color: #777; font-size: 11px; }
    @media print { body { margin: 8mm; } }
  </style></head><body>${body}</body></html>`;

  const w = window.open("", "_blank", "width=840,height=600");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
}
