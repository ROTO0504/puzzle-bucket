// src/components/ResultPanel.tsx
import { useEffect, useState } from "react";
import type { ScoreBreakdown } from "../types";

type PlayerScore = {
  name: string;
  total: number;
};

type ResultPanelProps = {
  score: ScoreBreakdown; // 元のスコア詳細
  playerName: string;
  allScores: PlayerScore[]; // これまでのランキング
  onRestart: () => void;
};

const getTitle = (rank: number) => {
  if (rank === 0) return "👑 次期店長";
  if (rank === 1) return "⭐ ベテラン店員";
  return "新人スタッフ";
};

const ResultPanel = ({ score, playerName, allScores, onRestart }: ResultPanelProps) => {
  const [displayTotal, setDisplayTotal] = useState(0);
  const [showRanking, setShowRanking] = useState(false);

  // 印字アニメ（スコアが徐々に増える）
  useEffect(() => {
    let current = 0;
    const target = Math.round(score.total);
    const step = Math.max(Math.floor(target / 20), 1);

    const interval = setInterval(() => {
      current += step;
      if (current >= target) {
        current = target;
        clearInterval(interval);
        setShowRanking(true);
      }
      setDisplayTotal(current);
    }, 50);

    return () => clearInterval(interval);
  }, [score.total]);

  // ランキング計算（降順）
  const ranking = [...allScores, { name: playerName, total: Math.round(score.total) }]
    .sort((a, b) => b.total - a.total);

  const rows: Array<{ label: string; value: number; max: number }> = [
    { label: "Packing", value: score.empty, max: 40 },
    { label: "Balance", value: score.balance, max: 30 },
    { label: "Stability", value: score.stability, max: 30 },
    { label: "Fragile", value: score.fragileAdjustment, max: 10 },
  ];

  return (
    <div className="result-panel" style={{ padding: 20, fontFamily: "monospace" }}>
      <div
        className="result-panel__card"
        style={{
          maxWidth: 400,
          margin: "0 auto",
          padding: 16,
          border: "1px solid #DDD",
          borderRadius: 8,
          backgroundColor: "#FFF",
        }}
      >
        <h2 className="result-panel__title">Scoring</h2>
        <div
          className="result-panel__total"
          style={{ display: "flex", justifyContent: "space-between", fontSize: 24, margin: "8px 0" }}
        >
          <span>Total</span>
          <strong>{displayTotal}</strong>
        </div>

        <div className="result-panel__rows">
          {rows.map(({ label, value, max }) => (
            <div key={label} className="result-panel__row" style={{ marginBottom: 6 }}>
              <div className="result-panel__row-header" style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{label}</span>
                <span>{value.toFixed(1)}</span>
              </div>
              <div className="result-panel__bar" style={{ height: 6, backgroundColor: "#EEE", borderRadius: 3 }}>
                <div
                  className="result-panel__bar-fill"
                  style={{
                    width: `${Math.min(Math.max(value / max, 0), 1) * 100}%`,
                    height: "100%",
                    backgroundColor: "#4DA3FF",
                    borderRadius: 3,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {showRanking && (
          <div style={{ marginTop: 16 }}>
            <p>★ ランキング ★</p>
            {ranking.map((p, idx) => (
              <p key={idx}>
                {idx + 1}位：{p.total}円　{p.name} {getTitle(idx)}
              </p>
            ))}
          </div>
        )}

        <button
          className="result-panel__restart"
          onClick={onRestart}
          style={{
            marginTop: 16,
            padding: "8px 16px",
            borderRadius: 8,
            backgroundColor: "#4DA3FF",
            color: "#FFF",
            border: "none",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Restart
        </button>
      </div>
    </div>
  );
};

export default ResultPanel;

