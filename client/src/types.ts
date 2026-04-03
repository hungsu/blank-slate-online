export interface PlayerInfo {
  id: string;
  name: string;
  score: number;
  isEditing?: boolean;
}

export interface AnswerReveal {
  playerName: string;
  answer: string;
  pointsEarned: number;
}

export interface LobbyUpdatePayload {
  players: PlayerInfo[];
  creatorId: string;
  roomId: string;
}

export interface GameStartedPayload {
  prompt: string;
  round: number;
  scoreboard: { name: string; score: number }[];
}

export interface SubmissionUpdatePayload {
  submitted: number;
  total: number;
}

export interface RoundResultsPayload {
  reveals: AnswerReveal[];
  scoreboard: { name: string; score: number }[];
  winner: string | null;
  round: number;
}

export interface GameOverPayload {
  winner: string;
  scoreboard: { name: string; score: number }[];
}

export type AppPhase =
  | "home"
  | "lobby"
  | "playing"
  | "round_results"
  | "game_over";
