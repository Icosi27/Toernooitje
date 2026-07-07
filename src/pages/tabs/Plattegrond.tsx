import { useOutletContext } from "react-router-dom";
import type { Tournament } from "../../types";
import { VenueMapEditor } from "../../components/VenueMap";

/**
 * Eigen tabblad voor de veldindeling/plattegrond: positioneer velden, kantine
 * en kleedkamers zodat iedereen op de publieke pagina ziet waar hij moet zijn.
 */
export default function Plattegrond() {
  const t = useOutletContext<Tournament>();

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold">🗺️ Plattegrond</h2>
        <p className="mt-1 text-sm text-slate-600">
          Teken je sportpark na: sleep de velden, kantine en kleedkamers op hun plek. Bezoekers
          krijgen automatisch een Plattegrond-tabblad op de toernooipagina en zien een 📍 op het
          veld van hun volgende wedstrijd.
        </p>
      </div>
      <VenueMapEditor t={t} />
    </div>
  );
}
