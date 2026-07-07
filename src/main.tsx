import React from "react";
import ReactDOM from "react-dom/client";
import { createHashRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import Home from "./pages/Home";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import { Privacy, Voorwaarden } from "./pages/Juridisch";
import Wizard from "./pages/Wizard";
import Dashboard from "./pages/Dashboard";
import Algemeen from "./pages/tabs/Algemeen";
import Deelnemers from "./pages/tabs/Deelnemers";
import Indeling from "./pages/tabs/Indeling";
import Schema from "./pages/tabs/Schema";
import Presentatie from "./pages/tabs/Presentatie";
import Resultaten from "./pages/tabs/Resultaten";
import Live, { Bekijk, KijkLive } from "./pages/Live";
import Portal from "./pages/Portal";
import Inschrijven from "./pages/Inschrijven";

const router = createHashRouter([
  { path: "/", element: <Landing /> },
  { path: "/app", element: <Home /> },
  { path: "/login", element: <Auth /> },
  { path: "/registreren", element: <Auth /> },
  { path: "/voorwaarden", element: <Voorwaarden /> },
  { path: "/privacy", element: <Privacy /> },
  { path: "/nieuw", element: <Wizard /> },
  {
    path: "/t/:id",
    element: <Dashboard />,
    children: [
      { index: true, element: <Algemeen /> },
      { path: "deelnemers", element: <Deelnemers /> },
      { path: "indeling", element: <Indeling /> },
      { path: "schema", element: <Schema /> },
      { path: "presentatie", element: <Presentatie /> },
      { path: "resultaten", element: <Resultaten /> },
    ],
  },
  { path: "/live/:id", element: <Live /> },
  { path: "/bekijk", element: <Bekijk /> },
  { path: "/kijk/:id", element: <KijkLive /> },
  { path: "/inschrijven/:id", element: <Inschrijven /> },
  { path: "/invoer/:id", element: <Portal /> },
  { path: "/scheids/:id/:refId", element: <Portal /> },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
