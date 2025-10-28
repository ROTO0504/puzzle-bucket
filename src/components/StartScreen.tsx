import { useState } from "react";
import { useGameStore } from "../store/useGameStore";
import ControlsHelp from "../components/ControlsHelp";
import "../components/StartScreen.css";

const StartScreen = () => {
  const startGame = useGameStore((s) => s.actions.startGame);
  const goToLeaderboard = useGameStore((s) => s.actions.goToLeaderboard);
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="overlay overlay--center start-screen">
      <div className="card card--lg receipt-style">
        {/* タイトル */}
        <h1 className="overlay__title">🛒 お買い物パズル</h1>
        <p className="overlay__desc">カゴにきれいに詰めて、芸術点を稼ごう！</p>

        {/* ボタン類 */}
        <div className="actions" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {/* 操作説明ボタン */}
          <button
            className="btn"
            onClick={() => setShowHelp(!showHelp)}
          >
            {showHelp ? "操作説明を閉じる" : "操作説明を見る"}
          </button>

          {/* ランキングボタン */}
          <button className="btn" onClick={goToLeaderboard}>
            ランキング
          </button>

          {/* スタートボタン */}
          <button className="btn btn--primary" onClick={startGame}>
            🏪 仕事を始める
          </button>
        </div>

        {/* 操作説明カード */}
        {showHelp && (
          <div className="help-section" style={{ marginTop: 16 }}>
            {/* alwaysShow を渡してスタート画面用にフロー上で表示 */}
            <ControlsHelp alwaysShow />
          </div>
        )}
      </div>
    </div>
  );
};

export default StartScreen;
