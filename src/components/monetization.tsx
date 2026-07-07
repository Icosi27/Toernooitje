import { useEffect, useState } from "react";
import type { Tournament } from "../types";

/** Standaard-advertenties die de app draaiende houden, tot een organisator ze afkoopt. */
const HOUSE_ADS = [
  { text: "Jouw advertentie hier? Koop de reclame af en toon je eigen sponsoren.", emoji: "📣" },
  { text: "Toernooitje blijft gratis dankzij advertenties en giften. Bedankt voor je steun!", emoji: "💚" },
  { text: "Sportclub of lokale held? Adverteer op toernooipagina's in de buurt.", emoji: "⚽" },
];

export const DONATE_URL = "https://buymeacoffee.com/toernooitje";

/**
 * Reclameblok op de publieke pagina's. Afgekocht (adsRemoved) betekent: geen
 * huisadvertenties, maar de eigen sponsorblokken van de organisator.
 */
export function AdBlock({ t, slot = 0 }: { t: Tournament; slot?: number }) {
  const [i, setI] = useState(slot);
  const sponsors = t.presentation.sponsors.flatMap((b) => b.images);

  useEffect(() => {
    const id = setInterval(() => setI((x) => x + 1), 6000);
    return () => clearInterval(id);
  }, []);

  if (t.presentation.adsRemoved) {
    if (sponsors.length === 0) return null;
    const img = sponsors[i % sponsors.length];
    return (
      <div className="card flex items-center justify-center p-4">
        <a href={img.url || "#"} target="_blank" rel="noreferrer">
          <img src={img.dataUrl} alt="Sponsor" className="max-h-24 max-w-full object-contain" />
        </a>
      </div>
    );
  }

  const ad = HOUSE_ADS[i % HOUSE_ADS.length];
  return (
    <div className="card flex items-center gap-3 border-dashed p-4 text-sm text-slate-600">
      <span className="text-2xl">{ad.emoji}</span>
      <div>
        <span className="mr-2 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
          Advertentie
        </span>
        {ad.text}
      </div>
    </div>
  );
}

/**
 * Verticale reclame-boarding langs de dia's in presentatiemodus, als de
 * reclameborden rond een stadionveld. Afgekocht: eigen sponsorlogo's
 * gestapeld; anders een verticale huisadvertentie.
 */
export function Boarding({ t, side }: { t: Tournament; side: "left" | "right" }) {
  const [i, setI] = useState(side === "left" ? 0 : 1);
  const sponsors = t.presentation.sponsors.flatMap((b) => b.images);

  useEffect(() => {
    const id = setInterval(() => setI((x) => x + 1), 8000);
    return () => clearInterval(id);
  }, []);

  if (t.presentation.adsRemoved && sponsors.length === 0) return null;

  return (
    <aside className="card flex w-24 shrink-0 flex-col items-center gap-3 overflow-hidden p-2 lg:w-28">
      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
        {t.presentation.adsRemoved ? "Sponsors" : "Reclame"}
      </span>
      {t.presentation.adsRemoved ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-around gap-3">
          {Array.from({ length: Math.min(4, sponsors.length) }, (_, k) => {
            const img = sponsors[(i + k) % sponsors.length];
            return (
              <a key={k} href={img.url || "#"} target="_blank" rel="noreferrer" className="min-h-0">
                <img src={img.dataUrl} alt="Sponsor" className="max-h-24 w-full object-contain" />
              </a>
            );
          })}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-center gap-3 py-2">
          <span className="text-2xl">{HOUSE_ADS[i % HOUSE_ADS.length].emoji}</span>
          <span className="min-h-0 flex-1 overflow-hidden text-center text-[11px] leading-snug text-slate-500 [writing-mode:vertical-rl]">
            {HOUSE_ADS[i % HOUSE_ADS.length].text}
          </span>
        </div>
      )}
    </aside>
  );
}

/** Gift-knop: bezoekers en organisatoren kunnen doneren om de app levend te houden. */
export function DonateButton({ small = false }: { small?: boolean }) {
  return (
    <a
      href={DONATE_URL}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center gap-2 rounded-full bg-amber-400 font-semibold text-amber-950 shadow hover:bg-amber-300 transition ${
        small ? "px-3 py-1 text-xs" : "px-4 py-2 text-sm"
      }`}
      title="Steun Toernooitje met een gift"
    >
      🎁 Doneer
    </a>
  );
}
