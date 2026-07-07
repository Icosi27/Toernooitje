import { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import type { Tournament } from "../../types";
import { useApp } from "../../store";
import { Section, Toggle } from "../../components/ui";
import { DONATE_URL } from "../../components/monetization";
import { appUrl, copyText, encodeShare } from "../../logic/share";
import { uid } from "../../logic/id";

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
        <div className="space-y-3">
          <div className="card flex items-center justify-between gap-4 p-4">
            <div>
              <div className="font-semibold">Deellink voor deelnemers</div>
              <p className="mt-1 text-xs text-slate-500">
                Stuur deze link via WhatsApp of mail. De volledige stand zit in de link zelf
                (momentopname) — kopieer hem opnieuw nadat je uitslagen hebt ingevuld.
              </p>
            </div>
            <button
              className="btn-primary shrink-0"
              onClick={() => copy("share", appUrl(`/bekijk?d=${encodeShare(t)}`))}
            >
              {copied === "share" ? "✓ Gekopieerd" : "Kopieer link"}
            </button>
          </div>
          <div className="card flex items-center justify-between gap-4 p-4">
            <div>
              <div className="font-semibold">Invoerlink uitslagen (beheerders)</div>
              <p className="mt-1 text-xs text-slate-500">
                Simpele pagina om alleen uitslagen in te vullen — handig op dit apparaat aan de
                wedstrijdtafel. Werkt op andere telefoons zodra online synchronisatie er is.
              </p>
            </div>
            <button
              className="btn-outline shrink-0"
              onClick={() => copy("entry", appUrl(`/invoer/${t.id}`))}
            >
              {copied === "entry" ? "✓ Gekopieerd" : "Kopieer link"}
            </button>
          </div>
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
