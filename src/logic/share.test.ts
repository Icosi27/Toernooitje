import { describe, expect, it } from "vitest";
import type { Tournament } from "../types";
import { defaultPresentation, defaultScoring } from "../types";
import { decodeShare, encodeShare, publicView } from "./share";
import { uid } from "./id";

function fullTournament(): Tournament {
  return {
    id: uid(),
    name: "Zomertoernooi",
    createdAt: "2026-01-01",
    days: ["2026-06-01"],
    locations: ["Sportpark Test"],
    esport: false,
    divisions: [
      {
        id: uid(),
        name: "Divisie 1",
        teams: [
          {
            id: "t1",
            name: "FC Test",
            email: "geheim@team.nl",
            players: [{ id: "p1", name: "Jan", birthDate: "2010-01-01" }],
          },
        ],
        players: [{ id: "p2", name: "Los", birthDate: "2011-02-02" }],
        individualMode: false,
        stages: [],
      },
    ],
    sport: "Voetbal",
    scoring: defaultScoring(),
    fields: [],
    referees: [{ id: "r1", name: "Scheids", note: "privé-notitie", maxMatches: 5 }],
    admins: [{ id: "a1", name: "Beheerder", email: "admin@club.nl", rights: "volledig" }],
    matchDuration: 15,
    breakBetween: 5,
    startTime: "09:00",
    presentation: defaultPresentation(),
    cloud: { online: true, writeKey: "supergeheim" },
    registrations: [
      {
        id: "reg1",
        teamName: "Aanmelder",
        email: "aanmelder@mail.nl",
        phone: "0612345678",
        status: "nieuw",
        createdAt: "2026-01-01",
      },
    ],
  };
}

describe("publicView", () => {
  it("stript geheimen en persoonsgegevens", () => {
    const pub = publicView(fullTournament());
    expect(pub.cloud).toBeUndefined();
    expect(pub.admins).toHaveLength(0);
    expect(pub.registrations).toHaveLength(0);
    expect(pub.divisions[0].teams[0].email).toBeUndefined();
    expect(pub.divisions[0].teams[0].players[0].birthDate).toBeUndefined();
    expect(pub.divisions[0].players[0].birthDate).toBeUndefined();
    expect((pub.referees[0] as any).note).toBeUndefined();
  });

  it("houdt de sportieve data intact", () => {
    const pub = publicView(fullTournament());
    expect(pub.name).toBe("Zomertoernooi");
    expect(pub.divisions[0].teams[0].name).toBe("FC Test");
    expect(pub.divisions[0].teams[0].players[0].name).toBe("Jan");
    expect(pub.referees[0].name).toBe("Scheids");
  });

  it("verandert het origineel niet", () => {
    const t = fullTournament();
    publicView(t);
    expect(t.cloud?.writeKey).toBe("supergeheim");
    expect(t.admins).toHaveLength(1);
  });
});

describe("encodeShare / decodeShare", () => {
  it("maakt een roundtrip zonder verlies van sportieve data", () => {
    const t = fullTournament();
    const decoded = decodeShare(encodeShare(t));
    expect(decoded).not.toBeNull();
    expect(decoded!.name).toBe(t.name);
    expect(decoded!.divisions[0].teams[0].name).toBe("FC Test");
  });

  it("lekt geen geheimen of e-mailadressen via de link", () => {
    const raw = decodeURIComponent(encodeShare(fullTournament()));
    const decoded = decodeShare(encodeShare(fullTournament()))!;
    expect(JSON.stringify(decoded)).not.toContain("supergeheim");
    expect(JSON.stringify(decoded)).not.toContain("geheim@team.nl");
    expect(JSON.stringify(decoded)).not.toContain("aanmelder@mail.nl");
    expect(raw).not.toContain("supergeheim");
  });

  it("geeft null bij een kapotte link", () => {
    expect(decodeShare("dit-is-geen-geldige-link")).toBeNull();
    expect(decodeShare("")).toBeNull();
  });
});
