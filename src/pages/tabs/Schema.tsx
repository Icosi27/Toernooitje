import { useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Division, ScheduleEvent, Tournament } from "../../types";
import { useApp } from "../../store";
import { EmptyState, Modal, ModalActions } from "../../components/ui";
import { addMinutes, autoSchedule, shiftSchedule } from "../../logic/schedule";
import { splitField } from "../../logic/fields";
import { allMatches, resolveSlot, slotLabel } from "../../logic/resolve";
import { isPlayed } from "../../logic/standings";
import { TeamBadge } from "../../components/TeamBadge";
import {
  addEvent,
  blockMinutes,
  blockStart,
  fieldProgram,
  moveBlock,
  programConflicts,
  reflowEvents,
  removeEvent,
  setBlockStart,
  unplanMatch,
  unplannedProgram,
  updateEvent,
  type ProgramBlock,
} from "../../logic/program";
import { uid } from "../../logic/id";

const UNPLANNED = "__unplanned__";

/** Zachte, vaste chipkleuren per divisie (werkt in licht én donker). */
const DIVISION_CHIPS = [
  "bg-rose-100 text-rose-700",
  "bg-sky-100 text-sky-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-violet-100 text-violet-700",
  "bg-teal-100 text-teal-700",
];

export default function Schema() {
  const t = useOutletContext<Tournament>();
  const update = useApp((s) => s.updateTournament);
  const u = (fn: (t: Tournament) => void) => update(t.id, fn);

  // ---- undo (één stap): snapshot vóór elke planner-mutatie ----
  const [undo, setUndo] = useState<{ snap: Tournament; message: string } | null>(null);
  useEffect(() => {
    if (!undo) return;
    const h = setTimeout(() => setUndo(null), 8000);
    return () => clearTimeout(h);
  }, [undo]);
  const commit = (message: string, fn: (x: Tournament) => void) => {
    const snap: Tournament = JSON.parse(JSON.stringify(t));
    u(fn);
    setUndo({ snap, message });
  };
  const doUndo = () => {
    if (!undo) return;
    u((x) => {
      for (const k of Object.keys(x)) if (!(k in undo.snap)) delete (x as any)[k];
      Object.assign(x, undo.snap);
    });
    setUndo(null);
  };

  // ---- modals ----
  const [fieldModal, setFieldModal] = useState<{ id?: string } | null>(null);
  const [fieldName, setFieldName] = useState("");
  const [fieldStart, setFieldStart] = useState("");
  const [eventModal, setEventModal] = useState<
    { fieldId?: string; eventId?: string; kind: ScheduleEvent["kind"] } | null
  >(null);
  const [eventLabel, setEventLabel] = useState("");
  const [eventDuration, setEventDuration] = useState(15);

  const hasMatches = t.divisions.some((d) => allMatches(d).length > 0);
  const unplanned = unplannedProgram(t);
  const plannedCount = t.divisions.reduce(
    (n, d) => n + allMatches(d).filter((m) => m.start && m.fieldId).length,
    0
  );
  const conflicts = useMemo(() => programConflicts(t), [t]);

  // ---- kolommen: blokken per veld + parkeerplek ----
  const blockById = useMemo(() => {
    const map = new Map<string, ProgramBlock>();
    for (const f of t.fields) for (const b of fieldProgram(t, f.id)) map.set(b.id, b);
    for (const b of unplannedProgram(t)) map.set(b.id, b);
    return map;
  }, [t]);
  const committedCols = useMemo(() => {
    const cols: Record<string, string[]> = {};
    cols[UNPLANNED] = unplannedProgram(t).map((b) => b.id);
    for (const f of t.fields) cols[f.id] = fieldProgram(t, f.id).map((b) => b.id);
    return cols;
  }, [t]);

  // ---- drag-and-drop met live tijdpreview ----
  const [preview, setPreview] = useState<Record<string, string[]> | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const anchorsRef = useRef<Record<string, string>>({});
  const cols = preview ?? committedCols;

  const previewTimes = useMemo(() => {
    if (!preview) return null;
    const times: Record<string, string> = {};
    for (const f of t.fields) {
      let cursor = anchorsRef.current[f.id] ?? f.startTime ?? t.startTime;
      for (const id of preview[f.id] ?? []) {
        const b = blockById.get(id);
        if (!b) continue;
        times[id] = cursor;
        cursor = addMinutes(cursor, blockMinutes(t, b));
      }
    }
    return times;
  }, [preview, blockById, t]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const findContainer = (id: string, c: Record<string, string[]>) =>
    id in c ? id : Object.keys(c).find((k) => c[k].includes(id));

  const onDragStart = (e: DragStartEvent) => {
    const anchors: Record<string, string> = {};
    for (const f of t.fields) {
      const col = fieldProgram(t, f.id);
      anchors[f.id] = (col[0] && blockStart(col[0])) || f.startTime || t.startTime;
    }
    anchorsRef.current = anchors;
    setPreview(JSON.parse(JSON.stringify(committedCols)));
    setActiveId(String(e.active.id));
  };

  const onDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over) return;
    setPreview((prev) => {
      if (!prev) return prev;
      const from = findContainer(String(active.id), prev);
      const to = findContainer(String(over.id), prev);
      if (!from || !to) return prev;
      const b = blockById.get(String(active.id));
      if (b?.kind === "event" && to === UNPLANNED) return prev; // events kennen geen parkeerplek
      if (from === to) {
        const ids = prev[from];
        const oldIndex = ids.indexOf(String(active.id));
        const overIndex = ids.indexOf(String(over.id));
        if (oldIndex < 0 || overIndex < 0 || oldIndex === overIndex) return prev;
        return { ...prev, [from]: arrayMove(ids, oldIndex, overIndex) };
      }
      const fromIds = prev[from].filter((i) => i !== String(active.id));
      const toIds = [...prev[to]];
      let idx = toIds.indexOf(String(over.id));
      if (idx < 0) idx = toIds.length;
      toIds.splice(idx, 0, String(active.id));
      return { ...prev, [from]: fromIds, [to]: toIds };
    });
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    const p = preview;
    setPreview(null);
    setActiveId(null);
    if (!p || !over) return;
    const id = String(active.id);
    const to = findContainer(id, p);
    if (!to) return;
    const index = p[to].indexOf(id);
    // niets veranderd? dan ook geen undo-melding
    const before = committedCols;
    const beforeCol = findContainer(id, before);
    if (beforeCol === to && before[to]?.indexOf(id) === index) return;
    const b = blockById.get(id);
    if (!b) return;
    if (to === UNPLANNED) {
      if (b.kind !== "match") return;
      commit("Wedstrijd naar Niet gepland", (x) => unplanMatch(x, id));
      return;
    }
    const fieldName = t.fields.find((f) => f.id === to)?.name ?? "veld";
    commit(
      b.kind === "event" ? `"${b.event.label}" verplaatst` : `Wedstrijd verplaatst naar ${fieldName}`,
      (x) => moveBlock(x, id, to, index)
    );
  };

  const onDragCancel = () => {
    setPreview(null);
    setActiveId(null);
  };

  // ---- helpers voor blokweergave ----
  const divisionChip = (d: Division) => {
    const i = t.divisions.findIndex((x) => x.id === d.id);
    return DIVISION_CHIPS[Math.max(0, i) % DIVISION_CHIPS.length];
  };

  const individualLineup = (m: { id: string }, d: Division) => {
    for (const s of d.stages) {
      if (s.type === "individual" && s.lineups[m.id]) {
        const names = (ids: string[]) =>
          ids.map((id) => d.players.find((p) => p.id === id)?.name ?? "?").join(", ");
        return { a: names(s.lineups[m.id].a), b: names(s.lineups[m.id].b) };
      }
    }
    return null;
  };

  const displayTime = (b: ProgramBlock) =>
    (previewTimes && previewTimes[b.id]) ?? blockStart(b) ?? "";

  const openEventModal = (m: { fieldId?: string; eventId?: string; kind: ScheduleEvent["kind"] }) => {
    if (m.eventId) {
      const ev = (t.scheduleEvents ?? []).find((e) => e.id === m.eventId);
      setEventLabel(ev?.label ?? "");
      setEventDuration(ev?.durationMin ?? 15);
    } else {
      setEventLabel(m.kind === "pauze" ? "Pauze" : "");
      setEventDuration(15);
    }
    setEventModal(m);
  };

  const activeBlock = activeId ? blockById.get(activeId) : undefined;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h2 className="mr-auto text-xl font-bold">Programma</h2>
        <button className="btn-outline" onClick={() => { setFieldName(""); setFieldStart(""); setFieldModal({}); }}>
          Veld toevoegen
        </button>
        <button
          className="btn-primary"
          disabled={t.fields.length === 0 || !hasMatches}
          title={
            t.fields.length === 0
              ? "Voeg eerst een veld toe"
              : !hasMatches
                ? "Maak eerst een indeling"
                : "Verdeelt alle wedstrijden over de velden; pauzes en evenementen blijven staan"
          }
          onClick={() =>
            commit("Automatisch gepland", (x) => {
              const prev = Object.fromEntries((x.scheduleEvents ?? []).map((e) => [e.id, e.start]));
              autoSchedule(x);
              reflowEvents(x, prev);
            })
          }
        >
          ⚡ Plan automatisch
        </button>
      </div>

      {plannedCount > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <span title="Schuift alle nog niet gespeelde wedstrijden en de events op — gespeelde blijven staan">
            ⏱️ Uitloop? Schuif de rest op:
          </span>
          {[-5, 5, 10, 15].map((m) => (
            <button
              key={m}
              className="btn-outline px-3 py-1"
              onClick={() => commit(`Schema ${m > 0 ? `+${m}` : m} min geschoven`, (x) => void shiftSchedule(x, m))}
            >
              {m > 0 ? `+${m}` : m} min
            </button>
          ))}
          {conflicts.size > 0 && (
            <span className="ml-auto rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
              ⚠️ {conflicts.size} wedstrijd(en) met een dubbele boeking
            </span>
          )}
        </div>
      )}

      {t.fields.length === 0 && (
        <EmptyState
          icon="🟩"
          title="Voeg velden toe"
          subtitle="Elk veld krijgt zijn eigen programmakolom. Daarna kan je automatisch plannen of wedstrijden zelf slepen."
          action={<button className="btn-outline" onClick={() => setFieldModal({})}>Veld toevoegen</button>}
        />
      )}

      {t.fields.length > 0 && !hasMatches && (
        <EmptyState
          icon="📅"
          title="Er zijn nog geen wedstrijden om in te plannen"
          subtitle="Maak eerst een toernooi-indeling."
        />
      )}

      {t.fields.length > 0 && hasMatches && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
          onDragCancel={onDragCancel}
        >
          <div className="flex items-start gap-4 overflow-x-auto pb-4">
            {(unplanned.length > 0 || preview !== null) && (
              <ProgramColumn
                key={UNPLANNED}
                colId={UNPLANNED}
                title={`📥 Niet gepland (${(cols[UNPLANNED] ?? []).length})`}
                ids={cols[UNPLANNED] ?? []}
                render={(id) => {
                  const b = blockById.get(id);
                  if (!b) return null;
                  return (
                    <BlockCard
                      key={id}
                      block={b}
                      t={t}
                      time=""
                      conflicts={[]}
                      chipClass={b.kind === "match" ? divisionChip(b.division) : ""}
                      lineup={b.kind === "match" ? individualLineup(b.match, b.division) : null}
                      onArrow={undefined}
                      onTime={undefined}
                      onReferee={undefined}
                      onUnplan={undefined}
                      onEdit={undefined}
                      onRemove={undefined}
                    />
                  );
                }}
              />
            )}

            {t.fields.map((f) => {
              const ids = cols[f.id] ?? [];
              return (
                <ProgramColumn
                  key={f.id}
                  colId={f.id}
                  title={`🟩 ${f.name}`}
                  subtitle={`vanaf ${f.startTime || t.startTime}`}
                  onEditField={() => {
                    setFieldName(f.name);
                    setFieldStart(f.startTime ?? "");
                    setFieldModal({ id: f.id });
                  }}
                  onRemoveField={() => {
                    if (!confirm(`Veld "${f.name}" verwijderen? Wedstrijden op dit veld gaan naar "Niet gepland".`)) return;
                    commit(`Veld "${f.name}" verwijderd`, (x) => {
                      x.fields = x.fields.filter((y) => y.id !== f.id);
                      for (const d of x.divisions)
                        for (const m of allMatches(d))
                          if (m.fieldId === f.id) {
                            m.fieldId = undefined;
                            m.start = undefined;
                          }
                      x.scheduleEvents = (x.scheduleEvents ?? []).filter((e) => e.fieldId !== f.id);
                    });
                  }}
                  footer={
                    <div className="flex gap-2">
                      <button
                        className="btn-ghost flex-1 text-xs"
                        onClick={() => openEventModal({ fieldId: f.id, kind: "pauze" })}
                      >
                        + Pauze
                      </button>
                      <button
                        className="btn-ghost flex-1 text-xs"
                        onClick={() => openEventModal({ fieldId: f.id, kind: "evenement" })}
                      >
                        + Evenement
                      </button>
                    </div>
                  }
                  ids={ids}
                  render={(id, index) => {
                    const b = blockById.get(id);
                    if (!b) return null;
                    return (
                      <BlockCard
                        key={id}
                        block={b}
                        t={t}
                        time={displayTime(b)}
                        conflicts={conflicts.get(id) ?? []}
                        chipClass={b.kind === "match" ? divisionChip(b.division) : ""}
                        lineup={b.kind === "match" ? individualLineup(b.match, b.division) : null}
                        onArrow={(dir) => {
                          const target = index + dir;
                          if (target < 0 || target >= ids.length) return;
                          commit("Blok verschoven", (x) => moveBlock(x, id, f.id, target));
                        }}
                        onTime={(start) => commit("Tijd aangepast", (x) => setBlockStart(x, id, start))}
                        onReferee={
                          b.kind === "match"
                            ? (refId) =>
                                u((x) => {
                                  for (const dd of x.divisions) {
                                    const mm = allMatches(dd).find((y) => y.id === id);
                                    if (mm) mm.refereeId = refId || undefined;
                                  }
                                })
                            : undefined
                        }
                        onUnplan={
                          b.kind === "match"
                            ? () => commit("Wedstrijd naar Niet gepland", (x) => unplanMatch(x, id))
                            : undefined
                        }
                        onEdit={
                          b.kind === "event"
                            ? () => openEventModal({ eventId: id, kind: b.event.kind })
                            : undefined
                        }
                        onRemove={
                          b.kind === "event"
                            ? () => commit(`"${b.event.label}" verwijderd`, (x) => removeEvent(x, id))
                            : undefined
                        }
                      />
                    );
                  }}
                />
              );
            })}
          </div>

          <DragOverlay>
            {activeBlock ? (
              <div className="w-60 rotate-2 opacity-90">
                <BlockCard
                  block={activeBlock}
                  t={t}
                  time={blockStart(activeBlock) ?? ""}
                  conflicts={[]}
                  chipClass={activeBlock.kind === "match" ? divisionChip(activeBlock.division) : ""}
                  lineup={null}
                  overlay
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* undo-snackbar */}
      {undo && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl bg-slate-900 px-4 py-2.5 text-sm text-white shadow-lg">
          <span>{undo.message}</span>
          <button className="font-semibold underline" style={{ color: "var(--accent-soft)" }} onClick={doUndo}>
            Ongedaan maken
          </button>
          <button className="text-slate-400" onClick={() => setUndo(null)}>✕</button>
        </div>
      )}

      {fieldModal && (
        <Modal title={fieldModal.id ? "Veld bewerken" : "Veld toevoegen"} onClose={() => setFieldModal(null)}>
          <div className="space-y-4">
            <input
              className="input"
              placeholder="Naam (bijv. Veld 1)"
              value={fieldName}
              onChange={(e) => setFieldName(e.target.value)}
              autoFocus
            />
            <div>
              <label className="label">Starttijd (optioneel, anders toernooistart {t.startTime})</label>
              <input type="time" className="input" value={fieldStart} onChange={(e) => setFieldStart(e.target.value)} />
            </div>
            {fieldModal.id && (
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-sm font-semibold">Veld splitsen</div>
                <p className="mb-2 mt-1 text-xs text-slate-500">
                  Deel dit veld op in losse speelveldjes — bijv. twee 7x7-helften of vier
                  4x4-veldjes. Elk deel krijgt zijn eigen programmakolom; geplande wedstrijden
                  blijven op deel A staan en de plattegrond wordt mee opgedeeld.
                </p>
                <div className="flex gap-2">
                  {([2, 4] as const).map((n) => (
                    <button
                      key={n}
                      className="btn-outline"
                      onClick={() => {
                        const id = fieldModal.id!;
                        const naam = t.fields.find((f) => f.id === id)?.name ?? "veld";
                        commit(`"${naam}" gesplitst in ${n} veldjes`, (x) => splitField(x, id, n));
                        setFieldModal(null);
                      }}
                    >
                      {n === 2 ? "In 2 (7x7)" : "In 4 (4x4)"}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <ModalActions
            onCancel={() => setFieldModal(null)}
            onSubmit={() => {
              const editId = fieldModal.id;
              u((x) => {
                if (editId) {
                  const f = x.fields.find((y) => y.id === editId);
                  if (f) {
                    f.name = fieldName.trim();
                    f.startTime = fieldStart || undefined;
                  }
                } else {
                  x.fields.push({ id: uid(), name: fieldName.trim(), startTime: fieldStart || undefined });
                }
              });
              setFieldModal(null);
            }}
            disabled={!fieldName.trim()}
          />
        </Modal>
      )}

      {eventModal && (
        <Modal
          title={
            eventModal.eventId
              ? "Blok bewerken"
              : eventModal.kind === "pauze"
                ? "Pauze toevoegen"
                : "Evenement toevoegen"
          }
          onClose={() => setEventModal(null)}
        >
          <div className="space-y-4">
            <input
              className="input"
              placeholder={eventModal.kind === "pauze" ? "Pauze" : "Bijv. Prijsuitreiking"}
              value={eventLabel}
              onChange={(e) => setEventLabel(e.target.value)}
              autoFocus
            />
            <div>
              <label className="label">Duur (minuten)</label>
              <input
                type="number"
                min={1}
                className="input"
                value={eventDuration}
                onChange={(e) => setEventDuration(Math.max(1, Number(e.target.value) || 1))}
              />
            </div>
            {!eventModal.eventId && (
              <p className="text-xs text-slate-500">
                Het blok komt onderaan de kolom en kan daarna naar de juiste plek gesleept worden.
              </p>
            )}
          </div>
          <ModalActions
            onCancel={() => setEventModal(null)}
            onSubmit={() => {
              const m = eventModal;
              const label = eventLabel.trim() || (m.kind === "pauze" ? "Pauze" : "Evenement");
              if (m.eventId) {
                commit("Blok aangepast", (x) => updateEvent(x, m.eventId!, label, eventDuration));
              } else if (m.fieldId) {
                commit(
                  m.kind === "pauze" ? "Pauze toegevoegd" : "Evenement toegevoegd",
                  (x) => void addEvent(x, m.fieldId!, m.kind, label, eventDuration)
                );
              }
              setEventModal(null);
            }}
            disabled={eventModal.kind === "evenement" && !eventLabel.trim() && !eventModal.eventId}
          />
        </Modal>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ProgramColumn(props: {
  colId: string;
  title: string;
  subtitle?: string;
  ids: string[];
  render: (id: string, index: number) => React.ReactNode;
  footer?: React.ReactNode;
  onEditField?: () => void;
  onRemoveField?: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: props.colId });
  return (
    <div className="w-64 shrink-0">
      <div className="stadium flex items-center gap-2 rounded-t-xl px-3 py-2 text-sm font-semibold text-white">
        <span className="mr-auto truncate">{props.title}</span>
        {props.subtitle && <span className="text-xs font-normal opacity-80">{props.subtitle}</span>}
        {props.onEditField && (
          <button className="opacity-70 hover:opacity-100" title="Veld bewerken" onClick={props.onEditField}>
            ✎
          </button>
        )}
        {props.onRemoveField && (
          <button className="opacity-70 hover:opacity-100" title="Veld verwijderen" onClick={props.onRemoveField}>
            ✕
          </button>
        )}
      </div>
      <div
        ref={setNodeRef}
        className={`flex min-h-24 flex-col gap-2 rounded-b-xl border border-t-0 border-slate-200 bg-slate-50/60 p-2 ${
          isOver ? "ring-2 ring-inset" : ""
        }`}
        style={isOver ? ({ ["--tw-ring-color" as any]: "var(--accent)" } as React.CSSProperties) : undefined}
      >
        <SortableContext id={props.colId} items={props.ids} strategy={verticalListSortingStrategy}>
          {props.ids.map((id, i) => props.render(id, i))}
          {props.ids.length === 0 && (
            <p className="py-4 text-center text-xs text-slate-400">Sleep hier een blok naartoe</p>
          )}
        </SortableContext>
        {props.footer}
      </div>
    </div>
  );
}

function BlockCard(props: {
  block: ProgramBlock;
  t: Tournament;
  time: string;
  conflicts: string[];
  chipClass: string;
  lineup: { a: string; b: string } | null;
  overlay?: boolean;
  onArrow?: (dir: -1 | 1) => void;
  onTime?: (start: string) => void;
  onReferee?: (refereeId: string) => void;
  onUnplan?: () => void;
  onEdit?: () => void;
  onRemove?: () => void;
}) {
  const { block, t, time, conflicts, overlay } = props;
  const played = block.kind === "match" && isPlayed(block.match);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
    disabled: played || overlay,
  });
  const style: React.CSSProperties = overlay
    ? {}
    : { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.35 : 1 };

  const hasConflict = conflicts.length > 0;

  const body =
    block.kind === "match" ? (
      <MatchBody {...props} played={played} />
    ) : (
      <EventBody {...props} />
    );

  const base =
    block.kind === "event"
      ? block.event.kind === "pauze"
        ? "border-dashed border-slate-300 bg-slate-100"
        : "border-slate-200"
      : "border-slate-200 bg-white";

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        ...(block.kind === "event" && block.event.kind === "evenement"
          ? { background: "var(--accent-soft)" }
          : {}),
        ...(hasConflict ? { boxShadow: "0 0 0 2px rgb(239 68 68)" } : {}),
      }}
      className={`group rounded-lg border p-2 text-sm shadow-sm ${base} ${played ? "opacity-60" : ""}`}
      title={hasConflict ? conflicts.join("\n") : undefined}
    >
      <div className="flex items-center gap-1.5">
        {time !== "" &&
          (props.onTime && !played ? (
            <input
              type="time"
              className="score w-[74px] cursor-pointer bg-transparent text-sm font-bold"
              style={{ color: "var(--accent)" }}
              value={time}
              onChange={(e) => e.target.value && props.onTime!(e.target.value)}
            />
          ) : (
            <span className="score text-sm font-bold" style={{ color: "var(--accent)" }}>
              {time}
            </span>
          ))}
        {time !== "" && (
          <span
            className="score text-xs text-slate-400"
            title={block.kind === "match" ? "Eindtijd (excl. pauze erna)" : "Eindtijd"}
          >
            –{addMinutes(time, block.kind === "match" ? t.matchDuration : block.event.durationMin)}
          </span>
        )}
        {hasConflict && <span title={conflicts.join("\n")}>⚠️</span>}
        {played && <span title="Uitslag ingevuld — dit blok staat vast">🔒</span>}
        <span className="mr-auto" />
        {props.onArrow && !played && (
          <span className="hidden gap-0.5 group-hover:flex">
            <button className="rounded px-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Omhoog" onClick={() => props.onArrow!(-1)}>
              ▲
            </button>
            <button className="rounded px-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Omlaag" onClick={() => props.onArrow!(1)}>
              ▼
            </button>
          </span>
        )}
        {props.onEdit && (
          <button className="rounded px-1 text-slate-400 hover:text-slate-700" title="Bewerken" onClick={props.onEdit}>
            ✎
          </button>
        )}
        {props.onRemove && (
          <button className="rounded px-1 text-slate-400 hover:text-red-500" title="Verwijderen" onClick={props.onRemove}>
            ✕
          </button>
        )}
        {props.onUnplan && !played && (
          <button className="rounded px-1 text-slate-400 hover:text-red-500" title="Uit het schema (naar Niet gepland)" onClick={props.onUnplan}>
            ✕
          </button>
        )}
        {!played && !overlay && (
          <button
            className="cursor-grab touch-none rounded px-1 text-slate-300 hover:text-slate-600 active:cursor-grabbing"
            title="Versleep dit blok"
            {...attributes}
            {...listeners}
          >
            ⠿
          </button>
        )}
      </div>
      {body}
    </div>
  );
}

function MatchBody(props: {
  block: ProgramBlock;
  t: Tournament;
  chipClass: string;
  lineup: { a: string; b: string } | null;
  played?: boolean;
  onReferee?: (refereeId: string) => void;
}) {
  const { block, t } = props;
  if (block.kind !== "match") return null;
  const { match: m, division: d } = block;
  return (
    <>
      <div className="mt-1 font-semibold leading-snug">
        {props.lineup ? (
          <span className="text-xs">{props.lineup.a} — {props.lineup.b}</span>
        ) : (
          <span className="inline-flex flex-wrap items-center gap-1">
            <TeamBadge team={resolveSlot(m.a, d, t.scoring)} size={15} />
            {slotLabel(m.a, d, t.scoring)} —{" "}
            <TeamBadge team={resolveSlot(m.b, d, t.scoring)} size={15} />
            {slotLabel(m.b, d, t.scoring)}
          </span>
        )}
        {props.played && (
          <span className="score ml-2 text-slate-500">
            {m.scoreA}–{m.scoreB}
          </span>
        )}
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${props.chipClass}`}>{d.name}</span>
        {m.label && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
            {m.label}
          </span>
        )}
        {props.onReferee ? (
          <select
            className="ml-auto max-w-[45%] cursor-pointer truncate bg-transparent text-[11px] text-slate-500"
            value={m.refereeId ?? ""}
            onChange={(e) => props.onReferee!(e.target.value)}
            title="Scheidsrechter"
          >
            <option value="">geen scheids</option>
            {t.referees.map((r) => (
              <option key={r.id} value={r.id}>
                🦺 {r.name}
              </option>
            ))}
          </select>
        ) : (
          m.refereeId && (
            <span className="ml-auto text-[11px] text-slate-500">
              🦺 {t.referees.find((r) => r.id === m.refereeId)?.name}
            </span>
          )
        )}
      </div>
    </>
  );
}

function EventBody(props: { block: ProgramBlock }) {
  const { block } = props;
  if (block.kind !== "event") return null;
  const ev = block.event;
  return (
    <div className="mt-1 flex items-center gap-2">
      <span className="font-semibold">
        {ev.kind === "pauze" ? "☕" : "🎉"} {ev.label}
      </span>
      <span className="ml-auto rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
        {ev.durationMin} min
      </span>
    </div>
  );
}
