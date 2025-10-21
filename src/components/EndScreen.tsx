import { useMemo, useState } from "react";
import { useGameStore } from "../store/useGameStore";
import { addLeaderboardEntry } from "../utils/leaderboard";

const EndScreen = () => {
  const score = useGameStore((s) => s.score ?? s.pendingScore);
  const restart = useGameStore((s) => s.actions.restart);
  const goToLeaderboard = useGameStore((s) => s.actions.goToLeaderboard);

  const [name, setName] = useState<string>(() => localStorage.getItem("puzzle_bucket_name") || "");
  const total = useMemo(() => Math.round(score?.total ?? 0), [score]);

  const handleSave = () => {
    const n = name.trim() || "Player";
    try {
      addLeaderboardEntry({ name: n, score: total, date: new Date().toISOString() });
      localStorage.setItem("puzzle_bucket_name", n);
    } catch {}
    goToLeaderboard();
  };

  if (!score) return null;

  return (
    <div className="overlay overlay--center">
      <div className="card card--lg">
        <h2 className="overlay__title">結果</h2>
        <div className="score__total">Total: {total}</div>
        <div className="score__rows">
          <div className="score__row"><span>Packing</span><span>{score.empty.toFixed(1)}</span></div>
          <div className="score__row"><span>Balance</span><span>{score.balance.toFixed(1)}</span></div>
          <div className="score__row"><span>Stability</span><span>{score.stability.toFixed(1)}</span></div>
          <div className="score__row"><span>Fragile</span><span>{score.fragileAdjustment.toFixed(1)}</span></div>
        </div>
        <div className="form__row">
          <label>ユーザー名</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        </div>
        <div className="actions">
          <button className="btn" onClick={restart}>もう一度</button>
          <button className="btn btn--primary" onClick={handleSave}>保存してランキング</button>
        </div>
      </div>
    </div>
  );
};

export default EndScreen;

