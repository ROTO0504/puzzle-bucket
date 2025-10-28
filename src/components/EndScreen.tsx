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
    // StartScreen と同じ "雰囲気" に合わせるためクラスを揃えています
    <div className="overlay overlay--center start-screen">
      {/* StartScreen と同じカード見た目にするため receipt-style を追加 */}
      <div className="card card--lg receipt-style">
        <h2 className="overlay__title">結果</h2>
        

        <div className="score__total" style={{ color: "#000", fontWeight: 800 }}>Total: {total}</div>

        <div className="score__row"><span style={{ color: "rgba(0,0,0,0.6)" }}>Packing</span><span style={{ color: "#000" }}>{score.empty.toFixed(1)}</span> 
          <div className="score__row"><span>Packing</span><span>{score.empty.toFixed(1)}</span></div>
          <div className="score__row"><span>Balance</span><span>{score.balance.toFixed(1)}</span></div>
          <div className="score__row"><span>Stability</span><span>{score.stability.toFixed(1)}</span></div>
          <div className="score__row"><span>Fragile</span><span>{score.fragileAdjustment.toFixed(1)}</span></div>
        </div>

        <div className="form__row" style={{ marginBottom: 12, textAlign: "left" }}>
          <label style={{ display: "block", marginBottom: 6 }}>ユーザー名</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid #ddd",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div className="actions" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button className="btn" onClick={restart}>もう一度</button>
          <button className="btn btn--primary" onClick={handleSave}>保存してランキング</button>
        </div>
      </div>
    </div>
  );
};

export default EndScreen;