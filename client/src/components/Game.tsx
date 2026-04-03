import { useState, FormEvent } from "react";
import { socket } from "../socket";
import { SubmissionUpdatePayload } from "../types";

interface GameProps {
  prompt: string;
  round: number;
  scoreboard: { name: string; score: number }[];
  submissionUpdate: SubmissionUpdatePayload | null;
}

export function Game({ prompt, round, scoreboard, submissionUpdate }: GameProps) {
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitted) return;
    socket.emit("submit_answer", { answer });
    setSubmitted(true);
  }

  return (
    <div className="page game-page">
      <div className="game-header">
        <span className="round-label">Round {round}</span>
        <div className="scoreboard-mini">
          {scoreboard.map((s) => (
            <span key={s.name} className="score-chip">
              {s.name}: {s.score}
            </span>
          ))}
        </div>
      </div>

      <div className="prompt-card">
        <p className="prompt-text">{prompt}</p>
      </div>

      {!submitted ? (
        <form onSubmit={handleSubmit} className="answer-form">
          <input
            type="text"
            placeholder="Your answer…"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className="input answer-input"
            aria-label="Your answer"
            autoFocus
            autoComplete="off"
          />
          <button type="submit" className="btn btn-primary btn-large">
            Submit
          </button>
        </form>
      ) : (
        <div className="submitted-box">
          <p className="submitted-msg">✓ Answer submitted!</p>
          {submissionUpdate && (
            <p className="waiting-count">
              Waiting for {submissionUpdate.total - submissionUpdate.submitted} more
              player{submissionUpdate.total - submissionUpdate.submitted !== 1 ? "s" : ""}…
            </p>
          )}
        </div>
      )}
    </div>
  );
}
