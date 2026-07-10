export type ID = string;

export interface Player {
  id: ID;
  name: string;
  birthDate?: string;
  number?: string;
  points?: number; // voor individuele toernooien
}

export interface Team {
  id: ID;
  name: string;
  logo?: string; // dataURL
  email?: string;
  club?: string;
  present?: boolean;
  paid?: boolean;
  shirtColor?: string;
  shortsColor?: string;
  /** teruggetrokken: openstaande wedstrijden zijn reglementair toegekend */
  withdrawn?: boolean;
  players: Player[];
}

export interface Referee {
  id: ID;
  name: string;
  maxMatches?: number;
  note?: string;
  /** beperk tot deze velden; leeg/undefined = alle velden */
  fieldIds?: ID[];
  /** beperk tot deze divisies; leeg/undefined = alle divisies */
  divisionIds?: ID[];
  /** beschikbaar vanaf ("HH:MM"); leeg = vanaf de toernooistart */
  availableFrom?: string;
  /** beschikbaar tot ("HH:MM", einde wedstrijd); leeg = de hele dag */
  availableUntil?: string;
}

export interface Admin {
  id: ID;
  name: string;
  email: string;
  rights: "volledig" | "uitslagen";
}

export interface Field {
  id: ID;
  name: string;
  startTime?: string; // "HH:MM", overschrijft toernooistart
  location?: string;
}

/** Blok op de plattegrond, in canvas-eenheden (1000 x 600). */
export interface MapBlock {
  id: ID;
  kind: "field" | "kantine" | "kleedkamer" | "overig";
  fieldId?: ID; // koppeling met een veld
  label?: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface VenueMap {
  blocks: MapBlock[];
}

/** Verwijzing naar een deelnemer van een wedstrijd: een echt team of een placeholder. */
export type Slot =
  | { kind: "team"; teamId: ID }
  | { kind: "pouleRank"; pouleId: ID; rank: number } // nr. {rank} van poule
  | { kind: "winner"; matchId: ID }
  | { kind: "loser"; matchId: ID }
  | { kind: "tbd" };

export interface Match {
  id: ID;
  a: Slot;
  b: Slot;
  scoreA?: number;
  scoreB?: number;
  /** strafschoppen bij gelijkspel in KO */
  pensA?: number;
  pensB?: number;
  fieldId?: ID;
  start?: string; // "HH:MM"
  day?: number; // index in tournament.days
  refereeId?: ID;
  /** bij "teams als scheidsrechters": het team dat deze wedstrijd fluit */
  refereeTeamId?: ID;
  /** wedstrijd is bezig: score is live, maar telt pas mee na de eindstand */
  inProgress?: boolean;
  label?: string; // b.v. "Halve finale 1"
  round?: number; // speelronde binnen poule of KO-ronde
}

/**
 * Eventblok in het speelschema: pauze, prijsuitreiking, ceremonie...
 * Leeft bewust op toernooiniveau (niet in de fase-boom), zodat
 * wedstrijd-logica er nooit overheen struikelt.
 */
export interface ScheduleEvent {
  id: ID;
  kind: "pauze" | "evenement";
  label: string;
  durationMin: number;
  fieldId?: ID;
  start?: string; // "HH:MM"
  day?: number;
}

export interface Poule {
  id: ID;
  name: string;
  teamIds: ID[];
  matches: Match[];
  doubleRoundRobin?: boolean;
}

export interface PouleStage {
  id: ID;
  type: "poules";
  name: string;
  poules: Poule[];
}

export interface BracketRound {
  name: string; // "Kwartfinale", "Halve finale", "Finale"
  matches: Match[];
}

export interface BracketStage {
  id: ID;
  type: "bracket";
  name: string;
  size: number; // 2, 4, 8, 16, 32
  rounds: BracketRound[];
  thirdPlace?: boolean;
  consolation?: boolean; // verliezersronde (troostfinale volledig)
  /** de organisator start de fase expliciet; pas dan stromen teams door */
  started?: boolean;
}

export interface IndividualStage {
  id: ID;
  type: "individual";
  name: string;
  teamSize: number; // b.v. 4 (4x4)
  roundsCount: number;
  rounds: Match[][]; // per ronde: wedstrijden met ad-hoc teams
  /** per ronde, per match, per kant: speler-ids */
  lineups: Record<ID, { a: ID[]; b: ID[] }>;
}

export type Stage = PouleStage | BracketStage | IndividualStage;

export type FormatTemplate =
  | "competitie"
  | "roundrobin"
  | "wk"
  | "championsleague"
  | "knockout"
  | "individueel";

export interface Division {
  id: ID;
  name: string;
  teams: Team[];
  players: Player[]; // voor individuele sport
  individualMode: boolean;
  stages: Stage[];
  template?: FormatTemplate;
}

export interface ScoringConfig {
  win: number;
  draw: number;
  loss: number;
  useSets: boolean;
  /** volgorde van criteria bij gelijke stand */
  criteria: TiebreakCriterion[];
  shootouts: boolean;
}

export type TiebreakCriterion = "points" | "goalDiff" | "goalsFor" | "headToHead";

export interface SponsorBlock {
  id: ID;
  name: string;
  images: { id: ID; dataUrl: string; url?: string }[];
}

export interface Presentation {
  accentColor: string;
  logo?: string;
  background?: string;
  sponsors: SponsorBlock[];
  /** reclame afgekocht: geen Toernooitje-advertenties, eigen sponsors */
  adsRemoved: boolean;
  pages: { toernooi: boolean; standen: boolean; schema: boolean; scheidsrechters: boolean };
  showRanking: boolean;
  slideSeconds: number;
}

export interface Registration {
  id: ID;
  divisionId?: ID;
  teamName: string;
  contact?: string;
  email?: string;
  phone?: string;
  note?: string;
  /** door het team zelf doorgegeven tenue en logo; bij accepteren overgenomen */
  shirtColor?: string;
  shortsColor?: string;
  logo?: string; // dataURL, verkleind
  status: "nieuw" | "geaccepteerd" | "afgewezen";
  createdAt: string;
}

export interface Tournament {
  id: ID;
  name: string;
  createdAt: string;
  days: string[]; // ISO-datums
  locations: string[];
  esport: boolean;
  divisions: Division[];
  // doelgroep
  sport: string;
  gender?: string;
  ageMin?: number;
  ageMax?: number;
  level?: number; // 1-3
  city?: string;
  country?: string;
  scoring: ScoringConfig;
  fields: Field[];
  referees: Referee[];
  admins: Admin[];
  matchDuration: number; // minuten
  breakBetween: number; // minuten rust tussen wedstrijden op een veld
  /** minimale rust (minuten) tussen twee wedstrijden van hetzelfde team; 0/leeg = geen bewaking */
  minTeamRest?: number;
  startTime: string; // "HH:MM"
  presentation: Presentation;
  /**
   * Online synchronisatie (Supabase); writeKey blijft op het apparaat van de
   * organisator. refTokens: per scheidsrechter(-team) een eigen token dat
   * alléén uitslagen mag schrijven — dat gaat in de scheidslink i.p.v. de
   * writeKey. Het hele cloud-object wordt vóór publicatie gestript.
   */
  cloud?: { online: boolean; writeKey: string; refTokens?: Record<ID, string> };
  /** welke administratievelden per team worden bijgehouden */
  teamFields?: { present: boolean; paid: boolean; email: boolean };
  /** teams fluiten elkaars wedstrijden i.p.v. vaste scheidsrechters */
  teamsAsReferees?: boolean;
  /** scheidsrechters scoren live (doelpunt voor doelpunt) i.p.v. achteraf */
  liveScoring?: boolean;
  /** plattegrond van het sportpark (kantine, kleedkamers, velden) */
  venueMap?: VenueMap;
  /** eventblokken (pauzes, prijsuitreiking) in het speelschema */
  scheduleEvents?: ScheduleEvent[];
  /** online inschrijfpagina voor teams */
  registrationOpen?: boolean;
  registrationInfo?: string;
  registrations?: Registration[];
  /** maximum aantal (niet-afgewezen) inschrijvingen; daarna automatisch dicht */
  registrationLimit?: number;
  /** laatste dag (ISO-datum) waarop inschrijven kan; daarna automatisch dicht */
  registrationDeadline?: string;
}

export const defaultScoring = (): ScoringConfig => ({
  win: 3,
  draw: 1,
  loss: 0,
  useSets: false,
  criteria: ["points", "goalDiff", "goalsFor", "headToHead"],
  shootouts: false,
});

export const defaultPresentation = (): Presentation => ({
  accentColor: "#3722e0",
  sponsors: [],
  adsRemoved: false,
  pages: { toernooi: true, standen: true, schema: true, scheidsrechters: false },
  showRanking: false,
  slideSeconds: 8,
});
