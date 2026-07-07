import { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import type { Tournament } from "../../types";
import { useApp } from "../../store";
import { Section, Toggle } from "../../components/ui";
import { DONATE_URL } from "../../components/monetization";
import { appUrl, copyText, encodeShare } from "../../logic/share";
import { getClient, getCloudConfig, publishTournament, setCloudConfig } from "../../logic/cloud";
import { uid } from "../../logic/id";

/**
 * Live online zetten via Supabase: eenmalig URL + anon key plakken, daarna
 * per toernooi één klik. Links voor kijkers en scheidsrechters krijgen de
 * servergegevens mee zodat ze op elke telefoon werken.
 */
function CloudSharing({
  t,
  copied,
  copy,
}: {
  t: Tournament;
  copied: string | null;
  copy: (key: string, url: string) => void;
}) {
  const update = useApp((s) => s.updateTournament);
  const [config, setConfig] = useState(getCloudConfig());
  const [url, setUrl] = useState(config?.url ?? "");
  const [anon, setAnon] = useState(config?.anonKey ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(!config);

  const online = !!t.cloud?.online;
  const qs = config
    ? `?s=${encodeURIComponent(config.url)}&a=${encodeURIComponent(config.anonKey)}`
    : "";
  const qsWithKey = t.cloud ? `${qs}&k=${encodeURIComponent(t.cloud.writeKey)}` : qs;

  const goOnline = async () => {
    setBusy(true);
    setError(null);
    try {
      update(t.id, (x) => {
        if (!x.cloud) x.cloud = { online: true, writeKey: uid() + uid() };
        x.cloud.online = true;
      });
      const fresh = useApp.getState().tournaments.find((x) => x.id === t.id)!;
      await publishTournament(fresh);
    } catch (e) {
      setError(String((e as Error).message ?? e));
      update(t.id, (x) => {
        if (x.cloud) x.cloud.online = false;
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="font-semibold">
            Live online{" "}
            {online ? (
              <span className="ml-1 rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">● Live</span>
            ) : (
              <span className="ml-1 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">Offline</span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Deelnemers zien de standen live op hun eigen telefoon en scheidsrechters vullen zelf
            uitslagen in. Gratis via je eigen Supabase-account.
          </p>
        </div>
        {config && !online && (
          <button className="btn-primary shrink-0" disabled={busy} onClick={goOnline}>
            {busy ? "Bezig…" : "Zet live"}
          </button>
        )}
        {online && (
          <button
            className="btn-ghost shrink-0 text-red-500"
            onClick={() => update(t.id, (x) => x.cloud && (x.cloud.online = false))}
          >
            Stop live
          </button>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {(showConfig || !config) && (
        <div className="mt-4 space-y-3 rounded bg-slate-50 p-3">
          <p className="text-xs text-slate-600">
            <b>Eenmalige setup (gratis):</b> 1) maak een project op{" "}
            <a href="https://supabase.com" target="_blank" rel="noreferrer" className="underline">supabase.com</a>,
            2) plak de inhoud van <code>supabase/setup.sql</code> (staat in dit project) in de SQL
            Editor en klik Run, 3) kopieer bij Project Settings → API de URL en de "anon public" key
            hierheen.
          </p>
          <input className="input" placeholder="Supabase URL (https://xxxx.supabase.co)" value={url} onChange={(e) => setUrl(e.target.value)} />
          <input className="input" placeholder="Anon public key (eyJ…)" value={anon} onChange={(e) => setAnon(e.target.value)} />
          <button
            className="btn-outline"
            disabled={!url.trim() || !anon.trim()}
            onClick={() => {
              const c = { url: url.trim().replace(/\/$/, ""), anonKey: anon.trim() };
              setCloudConfig(c);
              setConfig(c);
              setShowConfig(false);
            }}
          >
            Opslaan
          </button>
        </div>
      )}
      {config && !showConfig && (
        <button className="mt-2 cursor-pointer text-xs text-slate-400 underline" onClick={() => setShowConfig(true)}>
          servergegevens wijzigen
        </button>
      )}

      {online && config && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between gap-3 rounded bg-slate-50 px-3 py-2">
            <span className="text-sm">📺 Kijklink voor deelnemers (live standen)</span>
            <button className="btn-outline" onClick={() => copy("live", appUrl(`/kijk/${t.id}${qs}`))}>
              {copied === "live" ? "✓ Gekopieerd" : "Kopieer"}
            </button>
          </div>
          <div className="flex items-center justify-between gap-3 rounded bg-slate-50 px-3 py-2">
            <span className="text-sm">✏️ Invoerlink beheerders (alle uitslagen)</span>
            <button className="btn-outline" onClick={() => copy("entry-live", appUrl(`/invoer/${t.id}${qsWithKey}`))}>
              {copied === "entry-live" ? "✓ Gekopieerd" : "Kopieer"}
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Scheidsrechterlinks kopieer je per scheidsrechter op de Deelnemers-pagina — die bevatten
            dan automatisch de live-verbinding. Let op: links werken pas op andere telefoons als de
            app online staat (bijv. GitHub Pages), niet vanaf localhost.
          </p>
        </div>
      )}
    </div>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

export default function Presentatie() {
  const t = useOutletContext<Tournament>();
  const update = useApp((s) => s.updateTournament);
  const u = (fn: (t: Tournament) => void) => update(t.id, fn);
  const p = t.presentation;
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (key: string, url: string) => {
    if (await copyText(url)) {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="card mb-6 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold">
              Toernooiwebsite{" "}
              <span className="ml-1 rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">Actief</span>
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Presenteer je toernooi aan de deelnemers en het publiek. Open de pagina en zet hem
              op een groot scherm als diavoorstelling.
            </p>
          </div>
          <Link to={`/live/${t.id}`} className="btn-primary shrink-0">Open website</Link>
        </div>
      </div>

      <Section title="Delen" subtitle="Laat deelnemers de standen en het schema bekijken" defaultOpen>
        <CloudSharing t={t} copied={copied} copy={copy} />
        <div className="card mt-3 flex items-center justify-between gap-4 p-4">
          <div>
            <div className="font-semibold">Deellink zonder internet-account (momentopname)</div>
            <p className="mt-1 text-xs text-slate-500">
              De volledige stand zit in de link zelf. Werkt altijd, maar werkt níet live bij —
              kopieer hem opnieuw nadat je uitslagen hebt ingevuld.
            </p>
          </div>
          <button
            className="btn-outline shrink-0"
            onClick={() => copy("share", appUrl(`/bekijk?d=${encodeShare(t)}`))}
          >
            {copied === "share" ? "✓ Gekopieerd" : "Kopieer link"}
          </button>
        </div>
      </Section>

      <Section title="Pagina's" subtitle="Wat is zichtbaar op de publieke website" defaultOpen>
        <div className="grid grid-cols-2 gap-3">
          <Toggle checked={p.pages.toernooi} onChange={(v) => u((x) => (x.presentation.pages.toernooi = v))} label="Toernooi-info" />
          <Toggle checked={p.pages.standen} onChange={(v) => u((x) => (x.presentation.pages.standen = v))} label="Standen" />
          <Toggle checked={p.pages.schema} onChange={(v) => u((x) => (x.presentation.pages.schema = v))} label="Speelschema" />
          <Toggle checked={p.pages.scheidsrechters} onChange={(v) => u((x) => (x.presentation.pages.scheidsrechters = v))} label="Scheidsrechters" />
        </div>
      </Section>

      <Section title="Vormgeving" subtitle="Accentkleur, logo en achtergrond van website en dashboard">
        <div className="space-y-5">
          <div>
            <label className="label">Accentkleur</label>
            <input
              type="color"
              value={p.accentColor}
              className="h-10 w-20 cursor-pointer rounded border border-slate-200"
              onChange={(e) => u((x) => (x.presentation.accentColor = e.target.value))}
            />
          </div>
          <div>
            <label className="label">Logo (PNG met transparante achtergrond)</label>
            <div className="flex items-center gap-4">
              {p.logo && <img src={p.logo} alt="logo" className="h-16 rounded border border-slate-200 p-1" />}
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    const url = await fileToDataUrl(f);
                    u((x) => (x.presentation.logo = url));
                  }
                }}
              />
            </div>
          </div>
          <div>
            <label className="label">Achtergrondfoto</label>
            <div className="flex items-center gap-4">
              {p.background && <img src={p.background} alt="achtergrond" className="h-16 rounded border border-slate-200" />}
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    const url = await fileToDataUrl(f);
                    u((x) => (x.presentation.background = url));
                  }
                }}
              />
            </div>
          </div>
        </div>
      </Section>

      <Section
        title="Reclame & sponsors"
        subtitle="Toernooitje is gratis dankzij advertenties. Koop ze af en toon je eigen sponsoren."
        defaultOpen
      >
        <div className="card mb-4 flex items-center justify-between gap-4 p-4">
          <div>
            <div className="font-semibold">
              Reclame afkopen{" "}
              {p.adsRemoved ? (
                <span className="ml-1 rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">Afgekocht</span>
              ) : (
                <span className="ml-1 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700">€ 10 per toernooi</span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Zonder afkoop tonen we bescheiden advertenties op de publieke pagina's om de app
              draaiende te houden. Na afkoop verschijnen daar jouw eigen sponsorblokken.
            </p>
          </div>
          {p.adsRemoved ? (
            <button className="btn-outline shrink-0" onClick={() => u((x) => (x.presentation.adsRemoved = false))}>
              Ongedaan maken
            </button>
          ) : (
            <button
              className="btn-primary shrink-0"
              onClick={() => {
                // hier komt later de echte betaalprovider (bijv. Mollie/Stripe)
                if (confirm("Demo: reclame afkopen voor dit toernooi? (Er wordt nu niets afgerekend.)"))
                  u((x) => (x.presentation.adsRemoved = true));
              }}
            >
              Afkopen
            </button>
          )}
        </div>

        <p className="mb-2 text-sm font-semibold">Sponsorblokken</p>
        <p className="mb-3 text-xs text-slate-500">
          Upload logo's van je sponsoren. Ze rouleren op de publieke website en in de diavoorstelling
          {p.adsRemoved ? "." : " zodra de reclame is afgekocht."}
        </p>
        {p.sponsors.map((b) => (
          <div key={b.id} className="card mb-3 p-3">
            <div className="mb-2 flex items-center justify-between">
              <input
                className="input border-0 font-semibold"
                value={b.name}
                onChange={(e) =>
                  u((x) => (x.presentation.sponsors.find((y) => y.id === b.id)!.name = e.target.value))
                }
              />
              <button
                className="btn-ghost text-red-500"
                onClick={() => u((x) => (x.presentation.sponsors = x.presentation.sponsors.filter((y) => y.id !== b.id)))}
              >
                ✕
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {b.images.map((img) => (
                <div key={img.id} className="relative">
                  <img src={img.dataUrl} alt="sponsor" className="h-14 rounded border border-slate-200 p-1" />
                  <button
                    className="absolute -right-2 -top-2 cursor-pointer rounded-full bg-white text-xs shadow"
                    onClick={() =>
                      u((x) => {
                        const blk = x.presentation.sponsors.find((y) => y.id === b.id)!;
                        blk.images = blk.images.filter((z) => z.id !== img.id);
                      })
                    }
                  >
                    ✕
                  </button>
                </div>
              ))}
              <label className="btn-outline cursor-pointer">
                Uploaden
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      const url = await fileToDataUrl(f);
                      u((x) => x.presentation.sponsors.find((y) => y.id === b.id)!.images.push({ id: uid(), dataUrl: url }));
                    }
                  }}
                />
              </label>
            </div>
          </div>
        ))}
        <button
          className="btn-outline w-full"
          onClick={() => u((x) => x.presentation.sponsors.push({ id: uid(), name: `Blok ${x.presentation.sponsors.length + 1}`, images: [] }))}
        >
          Nieuw sponsorblok
        </button>
      </Section>

      <Section title="Steun Toernooitje" subtitle="Gift-knop voor bezoekers en organisatoren">
        <p className="text-sm text-slate-600">
          Op elke publieke pagina staat een <b>🎁 Doneer</b>-knop. Giften gaan naar het draaiende
          houden van Toernooitje (servers en onderhoud):{" "}
          <a href={DONATE_URL} target="_blank" rel="noreferrer" className="underline" style={{ color: "var(--accent)" }}>
            {DONATE_URL}
          </a>
        </p>
      </Section>

      <Section title="Diavoorstelling" subtitle="Automatisch wisselen tussen standen en schema op een groot scherm">
        <label className="label">Seconden per dia</label>
        <input
          type="number"
          min={3}
          max={60}
          className="input w-24"
          value={p.slideSeconds}
          onChange={(e) => u((x) => (x.presentation.slideSeconds = +e.target.value))}
        />
      </Section>
    </div>
  );
}
