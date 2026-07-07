import { beforeEach, describe, expect, it } from "vitest";
import { useApp } from "./store";

describe("store", () => {
  beforeEach(() => {
    localStorage.clear();
    useApp.setState({ tournaments: [] });
  });

  it("maakt een toernooi met divisies aan", () => {
    const id = useApp
      .getState()
      .createTournament("Test", ["2026-06-01"], ["Sportpark"], ["A", "B"], false);
    const t = useApp.getState().tournaments.find((x) => x.id === id)!;
    expect(t.name).toBe("Test");
    expect(t.divisions.map((d) => d.name)).toEqual(["A", "B"]);
    expect(t.scoring.win).toBe(3);
  });

  it("updateTournament muteert een kopie, niet het oude object", () => {
    const id = useApp.getState().createTournament("Test", ["2026-06-01"], [], [], false);
    const before = useApp.getState().tournaments.find((x) => x.id === id)!;
    useApp.getState().updateTournament(id, (t) => (t.name = "Nieuw"));
    const after = useApp.getState().tournaments.find((x) => x.id === id)!;
    expect(after.name).toBe("Nieuw");
    expect(before.name).toBe("Test"); // oude referentie onaangetast
  });

  it("verwijdert een toernooi", () => {
    const id = useApp.getState().createTournament("Weg", ["2026-06-01"], [], [], false);
    useApp.getState().deleteTournament(id);
    expect(useApp.getState().tournaments.some((x) => x.id === id)).toBe(false);
  });
});
