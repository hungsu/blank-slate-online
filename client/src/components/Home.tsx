import { useState, FormEvent, useEffect } from "react";
import { socket } from "../socket";

interface HomeProps {
  initialRoomId?: string;
}

export function Home({ initialRoomId }: HomeProps) {
  const [joinCode, setJoinCode] = useState(initialRoomId ?? "");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!initialRoomId) return;

    function handleError({ message }: { message: string }) {
      setError(message);
      socket.disconnect();
    }

    socket.connect();
    socket.emit("join_room", { roomId: initialRoomId });
    socket.once("error", handleError);

    return () => {
      socket.off("error", handleError);
    };
  }, [initialRoomId]);

  function handleCreate() {
    setError("");
    socket.connect();
    socket.emit("create_room");
  }

  function handleJoin(e: FormEvent) {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      setError("Please enter a room code.");
      return;
    }
    setError("");
    socket.connect();
    socket.emit("join_room", { roomId: code });
    socket.once("error", ({ message }: { message: string }) => {
      setError(message);
      socket.disconnect();
    });
  }

  return (
    <div className="page home-page">
      <h1 className="title">Blank Slate Online</h1>
      <p className="subtitle">
        Fill in the blank — match exactly one other player to score big!
      </p>

      <button className="btn btn-primary btn-large" onClick={handleCreate}>
        Create Room
      </button>

      <div className="divider">or</div>

      <form onSubmit={handleJoin} className="join-form">
        <input
          type="text"
          placeholder="Room code"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          maxLength={6}
          className="input"
          aria-label="Room code"
        />
        <button type="submit" className="btn btn-secondary">
          Join Room
        </button>
      </form>

      {error && <p className="error">{error}</p>}
    </div>
  );
}
