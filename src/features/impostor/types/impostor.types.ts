export type RoleGoal = 'sabotage' | 'detect' | 'get_voted';
export type ChallengeDifficulty = 'easy' | 'medium' | 'hard';

export interface ImpostorRole {
  id: string;
  name: string;
  emoji: string;
  description: string;
  goal: RoleGoal;
  required: number;
  maxPerTeam: number | null;
  weight: number;
}

export interface ImpostorChallenge {
  text: string;
  difficulty: ChallengeDifficulty;
  points: number;
}

export interface ImpostorGameConfig {
  id: string;
  name: string;
  emoji: string;
  color: string;
  roles: ImpostorRole[];
  challenges: ImpostorChallenge[];
}

export interface ImpostorGamesConfig {
  games: ImpostorGameConfig[];
}

export type ImpostorStatus =
  | 'lobby'
  | 'in_progress'
  | 'validating'
  | 'voting'
  | 'finished'
  | 'cancelled';

export type TeamId = 'A' | 'B';
