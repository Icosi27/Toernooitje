import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { createHashRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import Landing from "./pages/Landing";

// Code-splitting per route: een kijker of scheidsrechter op mobiel langs het
// veld hoeft niet eerst het hele dashboard (dnd-kit, plattegrond-editor) te
// downloaden voordat er iets rendert.
const Home = lazy(() => import("./pages/Home"));
const Auth = lazy(() => import("./pages/Auth"));
const Voorwaarden = lazy(() => import("./pages/Juridisch").then((m) => ({ default: m.Voorwaarden })));
const Privacy = lazy(() => import("./pages/Juridisch").then((m) => ({ default: m.Privacy })));
const Wizard = lazy(() => import("./pages/Wizard"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Algemeen = lazy(() => import("./pages/tabs/Algemeen"));
const Deelnemers = lazy(() => import("./pages/tabs/Deelnemers"));
const Indeling = lazy(() => import("./pages/tabs/Indeling"));
const Schema = lazy(() => import("./pages/tabs/Schema"));
const Plattegrond = lazy(() => import("./pages/tabs/Plattegrond"));
const Presentatie = lazy(() => import("./pages/tabs/Presentatie"));
const Resultaten = lazy(() => import("./pages/tabs/Resultaten"));
const Live = lazy(() => import("./pages/Live"));
const Bekijk = lazy(() => import("./pages/Live").then((m) => ({ default: m.Bekijk })));
const KijkLive = lazy(() => import("./pages/Live").then((m) => ({ default: m.KijkLive })));
const Tv = lazy(() => import("./pages/Live").then((m) => ({ default: m.Tv })));
const Portal = lazy(() => import("./pages/Portal"));
const Inschrijven = lazy(() => import("./pages/Inschrijven"));

const S = (el: React.ReactNode) => (
  <Suspense fallback={<div className="p-10 text-center text-slate-500">Laden…</div>}>{el}</Suspense>
);

const router = createHashRouter([
  { path: "/", element: <Landing /> },
  { path: "/app", element: S(<Home />) },
  { path: "/login", element: S(<Auth />) },
  { path: "/registreren", element: S(<Auth />) },
  { path: "/voorwaarden", element: S(<Voorwaarden />) },
  { path: "/privacy", element: S(<Privacy />) },
  { path: "/nieuw", element: S(<Wizard />) },
  {
    path: "/t/:id",
    element: S(<Dashboard />),
    children: [
      { index: true, element: S(<Algemeen />) },
      { path: "deelnemers", element: S(<Deelnemers />) },
      { path: "indeling", element: S(<Indeling />) },
      { path: "schema", element: S(<Schema />) },
      { path: "plattegrond", element: S(<Plattegrond />) },
      { path: "presentatie", element: S(<Presentatie />) },
      { path: "resultaten", element: S(<Resultaten />) },
    ],
  },
  { path: "/live/:id", element: S(<Live />) },
  { path: "/bekijk", element: S(<Bekijk />) },
  { path: "/kijk/:id", element: S(<KijkLive />) },
  { path: "/tv/:id", element: S(<Tv />) },
  { path: "/inschrijven/:id", element: S(<Inschrijven />) },
  { path: "/invoer/:id", element: S(<Portal />) },
  { path: "/scheids/:id/:refId", element: S(<Portal />) },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
