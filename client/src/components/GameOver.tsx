interface GameOverProps {
  winner: string;
  scoreboard: { name: string; score: number }[];
}

export function GameOver({ winner, scoreboard }: GameOverProps) {
  function handlePlayAgain() {
    window.location.href = "/";
  }

  return (
    <div className="page gameover-page">
      <h1 className="title">🎉 Game Over!</h1>
      <p className="winner-text">
        <strong>{winner}</strong> wins!
      </p>

      <div className="scoreboard-section">
        <h2>Final Scores</h2>
        <ol className="scoreboard-list">
          {scoreboard.map((s, i) => (
            <li key={s.name} className={`score-row ${i === 0 ? "winner-row" : ""}`}>
              <span className="score-rank">{i === 0 ? "🏆" : `#${i + 1}`}</span>
              <span className="score-name">{s.name}</span>
              <span className="score-value">{s.score} pts</span>
            </li>
          ))}
        </ol>
      </div>

      <button className="btn btn-primary btn-large" onClick={handlePlayAgain}>
        Play Again
      </button>
    </div>
  );
}
