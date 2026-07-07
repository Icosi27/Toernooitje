import React, { useState } from "react";

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-md p-6 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-xl font-bold">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function ModalActions({
  onCancel,
  onSubmit,
  submitLabel = "Toevoegen",
  disabled,
}: {
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel?: string;
  disabled?: boolean;
}) {
  return (
    <div className="mt-6 flex justify-end gap-3">
      <button className="btn-ghost" onClick={onCancel} style={{ color: "var(--accent)" }}>
        Annuleren
      </button>
      <button className="btn-primary" onClick={onSubmit} disabled={disabled}>
        {submitLabel}
      </button>
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <span
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-block h-5 w-10 rounded-full transition ${
          checked ? "" : "bg-slate-300"
        }`}
        style={checked ? { background: "var(--accent)" } : undefined}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
            checked ? "left-5.5" : "left-0.5"
          }`}
        />
      </span>
      {label && <span className="text-sm">{label}</span>}
    </label>
  );
}

export function Section({
  title,
  subtitle,
  children,
  defaultOpen = false,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-slate-200 py-4">
      <button
        className="flex w-full items-center justify-between text-left cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        <div>
          <h3 className="text-lg font-bold">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
        <span className={`text-slate-400 transition ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open && <div className="mt-4">{children}</div>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 text-6xl">{icon}</div>
      <h2 className="text-xl font-bold">{title}</h2>
      {subtitle && <p className="mt-1 max-w-md text-sm text-slate-600">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function numberOrUndef(v: string): number | undefined {
  return v === "" ? undefined : Number(v);
}

/**
 * Divisiekeuze die over tabbladen heen onthouden wordt (per toernooi),
 * zodat je niet per ongeluk op de verkeerde divisie werkt na tab-wissel.
 */
export function useDivIdx(tournamentId: string, count: number): [number, (v: number) => void] {
  const key = `toernooitje-div-${tournamentId}`;
  const [idx, setIdx] = useState(() => {
    const raw = sessionStorage.getItem(key);
    return raw ? Number(raw) : 0;
  });
  const set = (v: number) => {
    setIdx(v);
    sessionStorage.setItem(key, String(v));
  };
  return [Math.min(idx, Math.max(0, count - 1)), set];
}
