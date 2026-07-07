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
  players: Player[];
}

export interface Referee {
  id: ID;
  name: string;
  maxMatches?: number;
  note?: string;
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
  label?: string; // b.v. "Halve finale 1"
  round?: number; // speelronde binnen poule of KO-ronde
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
  startTime: string; // "HH:MM"
  presentation: Presentation;
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
