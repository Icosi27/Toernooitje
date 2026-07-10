import type { CSSProperties } from "react";

/** "#rgb" of "#rrggbb" → [r, g, b], anders null. */
function hexToRgb(hex: string): [number, number, number] | null {
  const m3 = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(hex);
  if (m3) return [parseInt(m3[1] + m3[1], 16), parseInt(m3[2] + m3[2], 16), parseInt(m3[3] + m3[3], 16)];
  const m6 = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (m6) return [parseInt(m6[1], 16), parseInt(m6[2], 16), parseInt(m6[3], 16)];
  return null;
}

/**
 * Leesbare tekstkleur óp de accentkleur (voor knoppen en badges): wit op
 * donkere accenten, donker op lichte accenten zoals clubgeel. YIQ-formule.
 */
export function readableTextOn(color: string): string {
  const rgb = hexToRgb(color);
  if (!rgb) return "#ffffff";
  const yiq = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
  return yiq >= 160 ? "#0f172a" : "#ffffff";
}

/**
 * Inline-style met de accentkleur én het contrastvangnet: elke pagina die de
 * per-toernooi accentkleur zet, hoort dit te gebruiken zodat één gele of
 * pastel accentkeuze nergens onleesbare knoppen of scoreborden oplevert.
 */
export function accentStyle(accent: string): CSSProperties {
  return {
    ["--accent" as string]: accent,
    ["--accent-text" as string]: readableTextOn(accent),
  };
}
