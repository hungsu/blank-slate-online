import { socket } from "../socket";
import { AnswerReveal } from "../types";

interface RoundResultsProps {
  round: number;
  reveals: AnswerReveal[];
  scoreboard: { name: string; score: number }[];
  isCreator: boolean;
}

export function RoundResults({ round, reveals, scoreboard, isCreator }: RoundResultsProps) {
  function handleNextRound() {
    socket.emit("next_round");
  }

  return (
    <div className="page results-page">
      <h1 className="title">Round {round} Results</h1>

      <div className="reveals-grid">
        {reveals.map((r, i) => (
          <div
            key={i}
            className={`reveal-card ${r.pointsEarned === 3 ? "match-3" : r.pointsEarned === 1 ? "match-1" : "no-match"}`}
          >
            <span className="reveal-name">{r.playerName}</span>
            <span className="reveal-answer">{r.answer || <em>(blank)</em>}</span>
            <span className="reveal-points">
              {r.pointsEarned > 0 ? `+${r.pointsEarned} pts` : "0 pts"}
            </span>
          </div>
        ))}
      </div>

      <div className="scoreboard-section">
        <h2>Scoreboard</h2>
        <ol className="scoreboard-list">
          {scoreboard.map((s, i) => (
            <li key={s.name} className="score-row">
              <span className="score-rank">#{i + 1}</span>
              <span className="score-name">{s.name}</span>
              <span className="score-value">{s.score} pts</span>
            </li>
          ))}
        </ol>
      </div>

      {isCreator ? (
        <button className="btn btn-primary btn-large" onClick={handleNextRound}>
          Next Round
        </button>
      ) : (
        <p className="waiting">Waiting for the host to start the next round…</p>
      )}
    </div>
  );
}
