export const MAX_PLAYERS = 12;
export const MAX_NAME_LENGTH = 30;
export const WINNING_SCORE = 25;

export type GamePhase = "lobby" | "playing" | "round_results" | "game_over";

export interface Player {
  id: string;
  name: string;
  score: number;
  answer: string | null;
  hasSubmitted: boolean;
  isEditing: boolean;
}

export interface AnswerReveal {
  playerName: string;
  answer: string;
  pointsEarned: number;
}

export interface Room {
  id: string;
  creatorId: string;
  players: Map<string, Player>;
  phase: GamePhase;
  currentPrompt: string;
  currentPromptIndex: number;
  usedPromptIndices: Set<number>;
  round: number;
  lastReveal: AnswerReveal[];
  winner: string | null;
}

export function createRoom(roomId: string, creatorId: string): Room {
  return {
    id: roomId,
    creatorId,
    players: new Map(),
    phase: "lobby",
    currentPrompt: "",
    currentPromptIndex: -1,
    usedPromptIndices: new Set(),
    round: 0,
    lastReveal: [],
    winner: null,
  };
}

export function addPlayer(room: Room, playerId: string): void {
  room.players.set(playerId, {
    id: playerId,
    name: "",
    score: 0,
    answer: null,
    hasSubmitted: false,
    isEditing: false,
  });
}

export function removePlayer(room: Room, playerId: string): void {
  room.players.delete(playerId);
  if (room.creatorId === playerId) {
    const remaining = [...room.players.keys()];
    if (remaining.length > 0) {
      room.creatorId = remaining[0];
    }
  }
}

export function setPlayerName(room: Room, playerId: string, name: string): boolean {
  const player = room.players.get(playerId);
  if (!player) return false;
  const trimmed = name.trim().slice(0, MAX_NAME_LENGTH);
  if (!trimmed) return false;
  player.name = trimmed;
  player.isEditing = false;
  return true;
}

export function setPlayerEditing(room: Room, playerId: string, editing: boolean): boolean {
  const player = room.players.get(playerId);
  if (!player) return false;
  player.isEditing = editing;
  return true;
}

export function allPlayersNamed(room: Room): boolean {
  for (const p of room.players.values()) {
    if (!p.name || p.isEditing) return false;
  }
  return true;
}

export function allPlayersSubmitted(room: Room): boolean {
  for (const p of room.players.values()) {
    if (!p.hasSubmitted) return false;
  }
  return true;
}

export function submitAnswer(room: Room, playerId: string, answer: string): boolean {
  const player = room.players.get(playerId);
  if (!player || player.hasSubmitted) return false;
  player.answer = answer.trim();
  player.hasSubmitted = true;
  return true;
}

export function calculateRoundScores(room: Room): AnswerReveal[] {
  const players = [...room.players.values()];

  // Group players by their (normalised) answer
  const answerGroups = new Map<string, Player[]>();
  for (const p of players) {
    const key = (p.answer ?? "").toLowerCase().trim();
    if (!answerGroups.has(key)) answerGroups.set(key, []);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    answerGroups.get(key)!.push(p);
  }

  const reveals: AnswerReveal[] = [];
  for (const p of players) {
    const key = (p.answer ?? "").toLowerCase().trim();
    const group = answerGroups.get(key) ?? [];
    let pointsEarned = 0;
    if (group.length === 2) {
      pointsEarned = 3;
    } else if (group.length >= 3) {
      pointsEarned = 1;
    }
    p.score += pointsEarned;
    reveals.push({ playerName: p.name, answer: p.answer ?? "", pointsEarned });
  }

  // Sort by answer so matching answers appear together
  reveals.sort((a, b) => a.answer.toLowerCase().localeCompare(b.answer.toLowerCase()));
  return reveals;
}

export function checkWinner(room: Room): string | null {
  for (const p of room.players.values()) {
    if (p.score >= WINNING_SCORE) return p.name;
  }
  return null;
}

export function resetForNextRound(room: Room): void {
  for (const p of room.players.values()) {
    p.answer = null;
    p.hasSubmitted = false;
  }
}

export function getScoreboard(room: Room): { name: string; score: number }[] {
  return [...room.players.values()]
    .map((p) => ({ name: p.name, score: p.score }))
    .sort((a, b) => b.score - a.score);
}
