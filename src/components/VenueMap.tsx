import { useRef, useState } from "react";
import type { MapBlock, Tournament } from "../types";
import { useApp } from "../store";
import { uid } from "../logic/id";

/**
 * Plattegrond van het sportpark (naar het voorbeeld van de Trainingsplanner-
 * editor): blokken voor kantine, kleedkamers en velden op een canvas van
 * 1000x600 eenheden. De organisator sleept en vergroot blokken; bezoekers
 * krijgen een read-only weergave waarop "hun" veld oplicht.
 */

const W = 1000;
const H = 600;
const MIN = 50;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const pctX = (v: number) => `${(v / W) * 100}%`;
const pctY = (v: number) => `${(v / H) * 100}%`;

function blockStyle(kind: MapBlock["kind"]): { background: string; border: string } {
  switch (kind) {
    case "field":
      return { background: "linear-gradient(135deg, #15803d, #166534)", border: "2px solid #ffffffcc" };
    case "kantine":
      return { background: "linear-gradient(135deg, #92400e, #713f12)", border: "2px solid #d97706" };
    case "kleedkamer":
      return { background: "linear-gradient(135deg, #1d4ed8, #1e3a8a)", border: "2px solid #60a5fa" };
    default:
      return { background: "linear-gradient(135deg, #475569, #334155)", border: "2px solid #94a3b8" };
  }
}

function defaultLabel(kind: MapBlock["kind"]): string {
  return kind === "kantine" ? "Kantine" : kind === "kleedkamer" ? "Kleedkamers" : "Blok";
}

function BlockContent({
  b,
  name,
  highlight,
}: {
  b: MapBlock;
  name: string;
  highlight?: boolean;
}) {
  return (
    <>
      {b.kind === "field" && (
        <>
          {/* middenlijn + middencirkel */}
          <span
            className="pointer-events-none absolute rounded-full border-2 border-white/50"
            style={{
              width: Math.min(b.w, b.h) * 0.35,
              height: Math.min(b.w, b.h) * 0.35,
              left: "50%",
              top: "50%",
              transform: "translate(-50%,-50%)",
            }}
          />
          <span
            className="pointer-events-none absolute bg-white/50"
            style={
              b.w >= b.h
                ? { left: "50%", top: 4, bottom: 4, width: 2 }
                : { top: "50%", left: 4, right: 4, height: 2 }
            }
          />
        </>
      )}
      <span className="pointer-events-none relative z-10 max-w-full truncate px-1 text-center font-bold text-white drop-shadow">
        {b.kind === "kantine" && "🏠 "}
        {b.kind === "kleedkamer" && "🚿 "}
        {name}
      </span>
      {highlight && (
        <span className="pointer-events-none absolute -top-2 left-1/2 z-20 -translate-x-1/2 animate-bounce text-xl">
          📍
        </span>
      )}
    </>
  );
}

/** Read-only plattegrond voor de publieke pagina's. */
export function VenueMapView({
  t,
  highlightFieldId,
}: {
  t: Tournament;
  highlightFieldId?: string;
}) {
  const blocks = t.venueMap?.blocks ?? [];
  if (blocks.length === 0) return null;
  const fieldName = (b: MapBlock) =>
    b.kind === "field"
      ? (t.fields.find((f) => f.id === b.fieldId)?.name ?? b.label ?? "Veld")
      : (b.label ?? defaultLabel(b.kind));

  return (
    <div className="card fade-in overflow-hidden">
      <div
        className="relative w-full"
        style={{ aspectRatio: `${W}/${H}`, background: "linear-gradient(135deg, #14532d 0%, #052e16 100%)" }}
      >
        {blocks.map((b) => {
          const hl = !!highlightFieldId && b.fieldId === highlightFieldId;
          return (
            <div
              key={b.id}
              className="absolute flex items-center justify-center rounded-md text-xs sm:text-sm"
              style={{
                left: pctX(b.x),
                top: pctY(b.y),
                width: pctX(b.w),
                height: pctY(b.h),
                ...blockStyle(b.kind),
                boxShadow: hl ? "0 0 0 3px #fbbf24, 0 0 24px #fbbf2488" : "0 2px 8px rgba(0,0,0,.35)",
              }}
            >
              <BlockContent b={b} name={fieldName(b)} highlight={hl} />
            </div>
          );
        })}
      </div>
      {highlightFieldId && (
        <p className="border-t border-slate-100 px-3 py-1.5 text-xs text-slate-500">
          📍 = het veld van jullie volgende wedstrijd
        </p>
      )}
    </div>
  );
}

interface Drag {
  id: string;
  mode: "move" | "resize";
  startX: number;
  startY: number;
  orig: MapBlock;
  cur: Partial<MapBlock>;
}

/** Bewerkbare plattegrond voor de organisator (Schema-pagina). */
export function VenueMapEditor({ t }: { t: Tournament }) {
  const update = useApp((s) => s.updateTournament);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const blocks = t.venueMap?.blocks ?? [];
  const commit = (next: MapBlock[]) => update(t.id, (x) => (x.venueMap = { blocks: next }));

  const shown = blocks.map((b) => (drag && drag.id === b.id ? { ...b, ...drag.cur } : b));
  const selected = shown.find((b) => b.id === selectedId) ?? null;
  const unplacedFields = t.fields.filter((f) => !blocks.some((b) => b.fieldId === f.id));

  const addBlock = (kind: MapBlock["kind"], fieldId?: string) => {
    const size =
      kind === "field" ? { w: 200, h: 130 } : kind === "kantine" ? { w: 140, h: 90 } : { w: 120, h: 70 };
    const idx = blocks.length;
    const nb: MapBlock = {
      id: uid(),
      kind,
      fieldId,
      x: clamp(40 + (idx % 4) * 60, 0, W - size.w),
      y: clamp(40 + (idx % 3) * 60, 0, H - size.h),
      ...size,
    };
    commit([...blocks, nb]);
    setSelectedId(nb.id);
  };

  /** muispositie omrekenen naar canvas-eenheden (schaalt met de weergavebreedte) */
  const toCanvas = (e: React.PointerEvent): { x: number; y: number } => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * W,
      y: ((e.clientY - rect.top) / rect.height) * H,
    };
  };

  const startDrag = (e: React.PointerEvent, b: MapBlock, mode: Drag["mode"]) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(b.id);
    const p = toCanvas(e);
    setDrag({ id: b.id, mode, startX: p.x, startY: p.y, orig: b, cur: {} });
  };

  const onMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const p = toCanvas(e);
    const dx = p.x - drag.startX;
    const dy = p.y - drag.startY;
    const o = drag.orig;
    setDrag({
      ...drag,
      cur:
        drag.mode === "move"
          ? { x: clamp(o.x + dx, 0, W - o.w), y: clamp(o.y + dy, 0, H - o.h) }
          : { w: clamp(o.w + dx, MIN, W - o.x), h: clamp(o.h + dy, MIN, H - o.y) },
    });
  };

  const endDrag = () => {
    if (!drag) return;
    if (Object.keys(drag.cur).length > 0) {
      commit(blocks.map((b) => (b.id === drag.id ? { ...b, ...drag.cur } : b)));
    }
    setDrag(null);
  };

  const patchSelected = (patch: Partial<MapBlock>) => {
    if (!selected) return;
    commit(blocks.map((b) => (b.id === selected.id ? { ...b, ...patch } : b)));
  };

  const fieldName = (b: MapBlock) =>
    b.kind === "field"
      ? (t.fields.find((f) => f.id === b.fieldId)?.name ?? b.label ?? "Veld")
      : (b.label ?? defaultLabel(b.kind));

  return (
    <div>
      {/* palet */}
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <button className="btn-outline" onClick={() => addBlock("kantine")}>+ 🏠 Kantine</button>
        <button className="btn-outline" onClick={() => addBlock("kleedkamer")}>+ 🚿 Kleedkamers</button>
        <button className="btn-outline" onClick={() => addBlock("overig")}>+ Overig blok</button>
        {unplacedFields.map((f) => (
          <button key={f.id} className="btn-primary" onClick={() => addBlock("field", f.id)}>
            + 🟩 {f.name}
          </button>
        ))}
        {t.fields.length === 0 && (
          <span className="text-xs text-slate-500">Voeg eerst velden toe (hierboven), dan kun je ze plaatsen.</span>
        )}
      </div>

      {/* werkbalk voor het geselecteerde blok */}
      {selected && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg bg-slate-100 px-3 py-2 text-sm">
          <span className="font-semibold">{fieldName(selected)}</span>
          {selected.kind !== "field" && (
            <input
              className="rounded border border-slate-300 px-2 py-1 text-sm"
              placeholder={defaultLabel(selected.kind)}
              value={selected.label ?? ""}
              onChange={(e) => patchSelected({ label: e.target.value || undefined })}
            />
          )}
          <button
            className="btn-ghost text-xs"
            title="Draai het blok een kwartslag"
            onClick={() => patchSelected({ w: selected.h, h: selected.w })}
          >
            ⟳ draaien
          </button>
          <button
            className="btn-ghost text-xs text-red-500"
            onClick={() => {
              commit(blocks.filter((b) => b.id !== selected.id));
              setSelectedId(null);
            }}
          >
            ✕ verwijderen
          </button>
          <span className="ml-auto text-xs text-slate-400">sleep om te verplaatsen · hoekje = formaat</span>
        </div>
      )}

      {/* canvas */}
      <div
        ref={canvasRef}
        className="relative w-full select-none overflow-hidden rounded-xl border-2 border-slate-300"
        style={{
          aspectRatio: `${W}/${H}`,
          background: "linear-gradient(135deg, #14532d 0%, #052e16 100%)",
          touchAction: "none",
          cursor: drag ? (drag.mode === "move" ? "grabbing" : "se-resize") : "default",
        }}
        onPointerMove={onMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) setSelectedId(null);
        }}
      >
        {shown.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-white/50">
            Klik hierboven op een blok of veld om hem op de plattegrond te zetten.
          </div>
        )}
        {shown.map((b) => (
          <div
            key={b.id}
            className="absolute flex cursor-grab items-center justify-center rounded-md text-xs sm:text-sm"
            style={{
              left: pctX(b.x),
              top: pctY(b.y),
              width: pctX(b.w),
              height: pctY(b.h),
              ...blockStyle(b.kind),
              boxShadow:
                selectedId === b.id
                  ? "0 0 0 3px var(--accent), 0 4px 12px rgba(0,0,0,.4)"
                  : "0 2px 8px rgba(0,0,0,.35)",
              zIndex: selectedId === b.id ? 5 : 1,
            }}
            onPointerDown={(e) => startDrag(e, blocks.find((x) => x.id === b.id)!, "move")}
          >
            <BlockContent b={b} name={fieldName(b)} />
            {selectedId === b.id && (
              <span
                className="absolute -bottom-1.5 -right-1.5 z-20 h-4 w-4 cursor-se-resize rounded-sm border border-white bg-amber-400"
                onPointerDown={(e) => startDrag(e, blocks.find((x) => x.id === b.id)!, "resize")}
              />
            )}
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-500">
        De plattegrond verschijnt automatisch op de publieke toernooipagina zodra er blokken op
        staan. Bezoekers met een gekozen team zien een 📍 op het veld van hun volgende wedstrijd.
      </p>
    </div>
  );
}
