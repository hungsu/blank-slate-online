import { useState, FormEvent } from "react";
import { socket } from "../socket";
import { PlayerInfo } from "../types";

const MAX_NAME = 30;

interface LobbyProps {
  roomId: string;
  players: PlayerInfo[];
  myId: string;
  creatorId: string;
}

export function Lobby({ roomId, players, myId, creatorId }: LobbyProps) {
  const [name, setName] = useState("");
  const [nameSet, setNameSet] = useState(false);
  const [error, setError] = useState("");

  const isCreator = myId === creatorId;
  const me = players.find((p) => p.id === myId);
  const allNamed = players.length >= 2 && players.every((p) => p.name);

  const shareUrl = `${window.location.origin}/?room=${roomId}`;

  function copyLink() {
    navigator.clipboard.writeText(shareUrl).catch(() => {});
  }

  function handleSetName(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name cannot be empty.");
      return;
    }
    setError("");
    socket.emit("set_name", { name: trimmed });
    setNameSet(true);
  }

  function handleStartGame() {
    setError("");
    socket.emit("start_game");
    socket.once("error", ({ message }: { message: string }) => {
      setError(message);
    });
  }

  return (
    <div className="page lobby-page">
      <h1 className="title">Lobby</h1>

      <div className="room-code-box">
        <span className="room-label">Room code:</span>
        <span className="room-code">{roomId}</span>
        <button className="btn btn-small" onClick={copyLink} title="Copy invite link">
          Copy link
        </button>
      </div>

      {!nameSet || !me?.name ? (
        <form onSubmit={handleSetName} className="name-form">
          <input
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={MAX_NAME}
            className="input"
            aria-label="Your name"
            autoFocus
          />
          <button type="submit" className="btn btn-primary">
            Set Name
          </button>
        </form>
      ) : (
        <p className="name-set">
          Playing as <strong>{me.name}</strong>
        </p>
      )}

      <div className="players-section">
        <h2>Players ({players.length}/12)</h2>
        <ul className="player-list">
          {players.map((p) => (
            <li key={p.id} className={p.id === myId ? "player-item me" : "player-item"}>
              <span className="player-name">{p.name || <em>unnamed</em>}</span>
              {p.id === creatorId && <span className="badge creator">host</span>}
              {p.id === myId && <span className="badge you">you</span>}
              {p.name ? (
                <span className="ready-dot" title="Ready">✓</span>
              ) : (
                <span className="not-ready-dot" title="Not ready">…</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {isCreator && (
        <button
          className="btn btn-primary btn-large"
          onClick={handleStartGame}
          disabled={!allNamed}
          title={!allNamed ? "All players must enter a name first" : ""}
        >
          Start Game
        </button>
      )}

      {!isCreator && <p className="waiting">Waiting for the host to start…</p>}

      {error && <p className="error">{error}</p>}
    </div>
  );
}
