export const TEAM_NAMES = [
  'Raed', 'Mikkel', 'Bette', 'Mikkel 2',
  'Martin', 'Lars', 'Rasmus', 'Chris',
  'Steffen', 'Sune', 'Dof',
];

export interface BracketState {
  seeds: string[]; // seeded order, index 0 = top seed
  winners: Partial<Record<MatchId, string>>;
}

export type MatchId =
  | 'r1m1' | 'r1m2' | 'r1m3'  // play-in
  | 'qf1' | 'qf2' | 'qf3' | 'qf4'  // quarterfinals
  | 'sf1' | 'sf2'  // semifinals
  | 'final';

export interface MatchDef {
  id: MatchId;
  round: number;
  getTeam1: (s: BracketState) => string | null;
  getTeam2: (s: BracketState) => string | null;
}

function seed(state: BracketState, i: number) {
  return state.seeds[i] ?? null;
}

function winner(state: BracketState, id: MatchId) {
  return state.winners[id] ?? null;
}

export const MATCHES: MatchDef[] = [
  // Play-in (round 0)
  { id: 'r1m1', round: 0, getTeam1: s => seed(s, 5), getTeam2: s => seed(s, 10) },
  { id: 'r1m2', round: 0, getTeam1: s => seed(s, 6), getTeam2: s => seed(s, 9) },
  { id: 'r1m3', round: 0, getTeam1: s => seed(s, 7), getTeam2: s => seed(s, 8) },

  // Quarterfinals (round 1)
  { id: 'qf1', round: 1, getTeam1: s => seed(s, 0), getTeam2: s => winner(s, 'r1m3') },
  { id: 'qf2', round: 1, getTeam1: s => seed(s, 1), getTeam2: s => winner(s, 'r1m2') },
  { id: 'qf3', round: 1, getTeam1: s => seed(s, 2), getTeam2: s => winner(s, 'r1m1') },
  { id: 'qf4', round: 1, getTeam1: s => seed(s, 3), getTeam2: s => seed(s, 4) },

  // Semifinals (round 2)
  { id: 'sf1', round: 2, getTeam1: s => winner(s, 'qf1'), getTeam2: s => winner(s, 'qf4') },
  { id: 'sf2', round: 2, getTeam1: s => winner(s, 'qf2'), getTeam2: s => winner(s, 'qf3') },

  // Final (round 3)
  { id: 'final', round: 3, getTeam1: s => winner(s, 'sf1'), getTeam2: s => winner(s, 'sf2') },
];

export function shuffleTeams(): string[] {
  const arr = [...TEAM_NAMES];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const INITIAL_STATE: BracketState = {
  seeds: TEAM_NAMES,
  winners: {},
};
