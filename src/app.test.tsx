/**
 * Rooktests voor de app-schermen: renderen de belangrijkste pagina's zonder
 * crash en tonen ze hun kerninhoud? (Volledige flows zitten in de logic-tests.)
 */
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Wizard from "./pages/Wizard";
import { Privacy, Voorwaarden } from "./pages/Juridisch";
import Live from "./pages/Live";
import Schema from "./pages/tabs/Schema";
import { useApp, useTournament } from "./store";
import { buildFormat } from "./logic/formats";
import { autoSchedule } from "./logic/schedule";
import { addEvent } from "./logic/program";

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  useApp.setState({ tournaments: [] });
});

const at = (path: string, element: React.ReactElement, extra?: React.ReactElement) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={path.split("?")[0]} element={element} />
        {extra}
      </Routes>
    </MemoryRouter>
  );

describe("Landing", () => {
  it("toont hero, registreer-knop en juridische links", () => {
    at("/", <Landing />);
    expect(screen.getByText(/Registreer als organisator/)).toBeTruthy();
    expect(screen.getAllByText(/Inloggen/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Algemene voorwaarden/)).toBeTruthy();
    expect(screen.getByText(/Privacyverklaring/)).toBeTruthy();
    expect(screen.getAllByText(/Missie/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Sport verbindt/)).toBeTruthy();
  });
});

describe("Auth", () => {
  it("registreren toont naam-, e-mail- en wachtwoordveld", () => {
    at("/registreren", <Auth />);
    expect(screen.getByText("Account aanmaken")).toBeTruthy();
    expect(screen.getByText("Naam")).toBeTruthy();
    expect(screen.getByText("E-mailadres")).toBeTruthy();
  });

  it("inloggen toont wachtwoord-vergeten", () => {
    at("/login", <Auth />);
    expect(screen.getByText("Inloggen", { selector: "h1" })).toBeTruthy();
    expect(screen.getByText(/Wachtwoord vergeten/)).toBeTruthy();
  });
});

describe("Wizard", () => {
  it("start bij stap 1 met toernooinaam", () => {
    at("/nieuw", <Wizard />);
    expect(screen.getByText("Nieuw toernooi")).toBeTruthy();
    expect(screen.getByPlaceholderText("Toernooinaam")).toBeTruthy();
  });
});

describe("Juridische pagina's", () => {
  it("voorwaarden en privacy renderen hun artikelen", () => {
    at("/voorwaarden", <Voorwaarden />);
    expect(screen.getByText("Algemene voorwaarden")).toBeTruthy();
    expect(screen.getByText(/Toepasselijk recht/)).toBeTruthy();
  });

  it("privacy noemt de AVG-rechten", () => {
    at("/privacy", <Privacy />);
    expect(screen.getByText("Privacyverklaring")).toBeTruthy();
    expect(screen.getByText(/Jouw rechten/)).toBeTruthy();
  });
});

describe("Programma-tab (Schema)", () => {
  function TabShell({ id }: { id: string }) {
    const t = useTournament(id);
    return t ? <Outlet context={t} /> : null;
  }

  it("rendert kolommen per veld met wedstrijd- en pauzeblokken", () => {
    const id = useApp
      .getState()
      .createTournament("Plannertoernooi", ["2026-06-01"], ["Park"], ["Divisie 1"], false);
    useApp.getState().updateTournament(id, (t) => {
      const d = t.divisions[0];
      d.teams = Array.from({ length: 4 }, (_, i) => ({ id: `t${i}`, name: `Team ${i}`, players: [] }));
      d.stages = buildFormat(d, "competitie", {});
      t.fields = [
        { id: "f0", name: "Veld 1" },
        { id: "f1", name: "Veld 2" },
      ];
      autoSchedule(t);
      addEvent(t, "f0", "pauze", "Lunchpauze", 20);
    });
    render(
      <MemoryRouter initialEntries={[`/t/${id}/schema`]}>
        <Routes>
          <Route path="/t/:id" element={<TabShell id={id} />}>
            <Route path="schema" element={<Schema />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText(/Veld 1/)).toBeTruthy();
    expect(screen.getByText(/Veld 2/)).toBeTruthy();
    expect(screen.getByText(/Lunchpauze/)).toBeTruthy();
    expect(screen.getByText(/20 min/)).toBeTruthy();
    expect(screen.getAllByText("+ Pauze").length).toBe(2);
    expect(screen.getAllByText("+ Evenement").length).toBe(2);
    expect(screen.getByText(/Plan automatisch/)).toBeTruthy();
    expect(screen.getAllByText(/Team 0/).length).toBeGreaterThan(0);
  });
});

describe("Live-pagina", () => {
  it("rendert standen en schema voor een lokaal toernooi", () => {
    const id = useApp
      .getState()
      .createTournament("Rooktoernooi", ["2026-06-01"], ["Park"], ["Divisie 1"], false);
    render(
      <MemoryRouter initialEntries={[`/live/${id}`]}>
        <Routes>
          <Route path="/live/:id" element={<Live />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText("Rooktoernooi")).toBeTruthy();
    expect(screen.getByText("Standen")).toBeTruthy();
  });

  it("toont een nette melding bij een onbekend toernooi", () => {
    render(
      <MemoryRouter initialEntries={["/live/bestaat-niet"]}>
        <Routes>
          <Route path="/live/:id" element={<Live />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText(/Toernooi niet gevonden/)).toBeTruthy();
  });
});
