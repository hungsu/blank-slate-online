import { useEffect, useState } from "react";
import { socket } from "./socket";
import {
  AppPhase,
  PlayerInfo,
  LobbyUpdatePayload,
  GameStartedPayload,
  SubmissionUpdatePayload,
  RoundResultsPayload,
  GameOverPayload,
  AnswerReveal,
} from "./types";
import { Home } from "./components/Home";
import { Lobby } from "./components/Lobby";
import { Game } from "./components/Game";
import { RoundResults } from "./components/RoundResults";
import { GameOver } from "./components/GameOver";

function getRoomIdFromUrl(): string | undefined {
  const params = new URLSearchParams(window.location.search);
  return params.get("room") ?? undefined;
}

export function App() {
  const [phase, setPhase] = useState<AppPhase>("home");
  const [roomId, setRoomId] = useState<string>("");
  const [myId, setMyId] = useState<string>("");
  const [creatorId, setCreatorId] = useState<string>("");
  const [players, setPlayers] = useState<PlayerInfo[]>([]);

  // Game state
  const [prompt, setPrompt] = useState("");
  const [round, setRound] = useState(0);
  const [scoreboard, setScoreboard] = useState<{ name: string; score: number }[]>([]);
  const [submissionUpdate, setSubmissionUpdate] = useState<SubmissionUpdatePayload | null>(null);

  // Round results state
  const [reveals, setReveals] = useState<AnswerReveal[]>([]);

  // Game over state
  const [winner, setWinner] = useState("");

  const initialRoomId = getRoomIdFromUrl();

  useEffect(() => {
    socket.on("room_created", ({ roomId, playerId }: { roomId: string; playerId: string }) => {
      setMyId(playerId);
      setRoomId(roomId);
    });

    socket.on("room_joined", ({ roomId, playerId }: { roomId: string; playerId: string }) => {
      setMyId(playerId);
      setRoomId(roomId);
    });

    socket.on("lobby_update", (payload: LobbyUpdatePayload) => {
      setPlayers(payload.players);
      setCreatorId(payload.creatorId);
      setPhase("lobby");
    });

    socket.on("game_started", (payload: GameStartedPayload) => {
      setPrompt(payload.prompt);
      setRound(payload.round);
      setScoreboard(payload.scoreboard);
      setSubmissionUpdate(null);
      setPhase("playing");
    });

    socket.on("submission_update", (payload: SubmissionUpdatePayload) => {
      setSubmissionUpdate(payload);
    });

    socket.on("round_results", (payload: RoundResultsPayload) => {
      setReveals(payload.reveals);
      setScoreboard(payload.scoreboard);
      setRound(payload.round);
      setPhase("round_results");
    });

    socket.on("game_over", (payload: GameOverPayload) => {
      setWinner(payload.winner);
      setScoreboard(payload.scoreboard);
      setPhase("game_over");
    });

    return () => {
      socket.off("room_created");
      socket.off("room_joined");
      socket.off("lobby_update");
      socket.off("game_started");
      socket.off("submission_update");
      socket.off("round_results");
      socket.off("game_over");
    };
  }, []);

  if (phase === "home") {
    return <Home initialRoomId={initialRoomId} />;
  }

  if (phase === "lobby") {
    return (
      <Lobby
        roomId={roomId}
        players={players}
        myId={myId}
        creatorId={creatorId}
      />
    );
  }

  if (phase === "playing") {
    return (
      <Game
        prompt={prompt}
        round={round}
        scoreboard={scoreboard}
        submissionUpdate={submissionUpdate}
      />
    );
  }

  if (phase === "round_results") {
    return (
      <RoundResults
        round={round}
        reveals={reveals}
        scoreboard={scoreboard}
        isCreator={myId === creatorId}
      />
    );
  }

  if (phase === "game_over") {
    return <GameOver winner={winner} scoreboard={scoreboard} />;
  }

  return null;
}
