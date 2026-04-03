import express from "express";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import path from "path";
import rateLimit from "express-rate-limit";
import { nanoid } from "./nanoid";
import {
  MAX_PLAYERS,
  WINNING_SCORE,
  Room,
  createRoom,
  addPlayer,
  removePlayer,
  setPlayerName,
  allPlayersNamed,
  allPlayersSubmitted,
  submitAnswer,
  calculateRoundScores,
  checkWinner,
  resetForNextRound,
  getScoreboard,
} from "./game";
import { getRandomPrompt } from "./prompts";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" },
});

// Serve built client in production
const clientDist = path.join(__dirname, "../../client/dist");
const staticLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(staticLimiter);
app.use(express.static(clientDist));
app.get(/^\/(?!socket\.io).*/, (_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

// In-memory store
const rooms = new Map<string, Room>();

function broadcastLobby(room: Room): void {
  const players = [...room.players.values()].map((p) => ({
    id: p.id,
    name: p.name,
    score: p.score,
  }));
  for (const [playerId] of room.players) {
    io.to(playerId).emit("lobby_update", {
      players,
      creatorId: room.creatorId,
      roomId: room.id,
    });
  }
}

function broadcastGame(room: Room): void {
  io.to(room.id).emit("game_started", {
    prompt: room.currentPrompt,
    round: room.round,
    scoreboard: getScoreboard(room),
  });
}

function broadcastRoundResults(room: Room): void {
  io.to(room.id).emit("round_results", {
    reveals: room.lastReveal,
    scoreboard: getScoreboard(room),
    winner: room.winner,
    round: room.round,
  });
}

io.on("connection", (socket: Socket) => {
  let currentRoomId: string | null = null;

  function getRoom(): Room | null {
    if (!currentRoomId) return null;
    return rooms.get(currentRoomId) ?? null;
  }

  socket.on("create_room", () => {
    const roomId = nanoid(6);
    const room = createRoom(roomId, socket.id);
    rooms.set(roomId, room);
    addPlayer(room, socket.id);
    currentRoomId = roomId;
    socket.join(roomId);
    socket.emit("room_created", { roomId, playerId: socket.id });
    broadcastLobby(room);
  });

  socket.on("join_room", ({ roomId }: { roomId: string }) => {
    const room = rooms.get(roomId.toUpperCase());
    if (!room) {
      socket.emit("error", { message: "Room not found." });
      return;
    }
    if (room.phase !== "lobby") {
      socket.emit("error", { message: "Game already in progress." });
      return;
    }
    if (room.players.size >= MAX_PLAYERS) {
      socket.emit("error", { message: "Room is full (max 12 players)." });
      return;
    }
    addPlayer(room, socket.id);
    currentRoomId = roomId.toUpperCase();
    socket.join(currentRoomId);
    socket.emit("room_joined", { roomId: currentRoomId, playerId: socket.id });
    broadcastLobby(room);
  });

  socket.on("set_name", ({ name }: { name: string }) => {
    const room = getRoom();
    if (!room) return;
    const ok = setPlayerName(room, socket.id, name);
    if (!ok) {
      socket.emit("error", { message: "Invalid name." });
      return;
    }
    broadcastLobby(room);
  });

  socket.on("start_game", () => {
    const room = getRoom();
    if (!room || room.phase !== "lobby") return;
    if (room.creatorId !== socket.id) {
      socket.emit("error", { message: "Only the room creator can start the game." });
      return;
    }
    if (room.players.size < 3) {
      socket.emit("error", { message: "Need at least 3 players to start." });
      return;
    }
    if (!allPlayersNamed(room)) {
      socket.emit("error", { message: "All players must enter a name before starting." });
      return;
    }
    startNextRound(room);
  });

  socket.on("submit_answer", ({ answer }: { answer: string }) => {
    const room = getRoom();
    if (!room || room.phase !== "playing") return;
    const ok = submitAnswer(room, socket.id, answer);
    if (!ok) return;

    // Notify room that one more player has submitted (without revealing answer)
    const submitted = [...room.players.values()].filter((p) => p.hasSubmitted).length;
    const total = room.players.size;
    io.to(room.id).emit("submission_update", { submitted, total });

    if (allPlayersSubmitted(room)) {
      revealRound(room);
    }
  });

  socket.on("next_round", () => {
    const room = getRoom();
    if (!room || room.phase !== "round_results") return;
    if (room.creatorId !== socket.id) return;
    if (room.winner) return; // game is over
    startNextRound(room);
  });

  socket.on("disconnect", () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;
    removePlayer(room, socket.id);
    if (room.players.size === 0) {
      rooms.delete(currentRoomId);
      return;
    }
    if (room.phase === "lobby") {
      broadcastLobby(room);
    } else if (room.phase === "playing" && allPlayersSubmitted(room)) {
      revealRound(room);
    }
  });

  function startNextRound(room: Room): void {
    resetForNextRound(room);
    const result = getRandomPrompt(room.usedPromptIndices);
    if (!result) {
      // All prompts exhausted — end game by highest score
      room.phase = "game_over";
      const scores = getScoreboard(room);
      room.winner = scores[0]?.name ?? "No one";
      io.to(room.id).emit("game_over", { winner: room.winner, scoreboard: scores });
      return;
    }
    room.currentPrompt = result.prompt;
    room.currentPromptIndex = result.index;
    room.usedPromptIndices.add(result.index);
    room.round += 1;
    room.phase = "playing";
    broadcastGame(room);
  }

  function revealRound(room: Room): void {
    room.lastReveal = calculateRoundScores(room);
    room.winner = checkWinner(room);
    room.phase = room.winner ? "game_over" : "round_results";
    if (room.phase === "game_over") {
      io.to(room.id).emit("game_over", {
        winner: room.winner,
        scoreboard: getScoreboard(room),
      });
    } else {
      broadcastRoundResults(room);
    }
  }
});

const PORT = process.env.PORT ?? 3001;
httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
