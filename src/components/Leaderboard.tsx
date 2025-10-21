import { useMemo } from "react";
import { getLeaderboard } from "../utils/leaderboard";
import { useGameStore } from "../store/useGameStore";

const Leaderboard = () => {
  const goToStart = useGameStore((s) => s.actions.goToStart);
  const startGame = useGameStore((s) => s.actions.startGame);
  const entries = useMemo(() => getLeaderboard(), []);

  return (
    <div className="overlay overlay--center">
      <div className="card card--lg">
        <h2 className="overlay__title">ランキング</h2>
        <div className="lb__list">
          {entries.length === 0 && <div className="lb__empty">記録がありません</div>}
          {entries.map((e, i) => (
            <div key={`${e.name}-${e.date}-${i}`} className="lb__row">
              <span className="lb__rank">{i + 1}</span>
              <span className="lb__name">{e.name}</span>
              <span className="lb__score">{e.score}</span>
              <span className="lb__date">{new Date(e.date).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
        <div className="actions">
          <button className="btn" onClick={goToStart}>タイトルへ</button>
          <button className="btn btn--primary" onClick={startGame}>もう一度</button>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;

