import type { ScoreBreakdown } from "../types";

type ResultPanelProps = {
  score: ScoreBreakdown;
  onRestart: () => void;
};

const ResultPanel = ({ score, onRestart }: ResultPanelProps) => {
  const rows: Array<{ label: string; value: number; max: number }> = [
    { label: "Packing", value: score.empty, max: 40 },
    { label: "Balance", value: score.balance, max: 30 },
    { label: "Stability", value: score.stability, max: 30 },
    { label: "Fragile", value: score.fragileAdjustment, max: 10 },
  ];

  return (
    <div className="result-panel">
      <div className="result-panel__card">
        <h2 className="result-panel__title">Scoring</h2>
        <div className="result-panel__total">
          <span>Total</span>
          <strong>{Math.round(score.total)}</strong>
        </div>
        <div className="result-panel__rows">
          {rows.map(({ label, value, max }) => (
            <div key={label} className="result-panel__row">
              <div className="result-panel__row-header">
                <span>{label}</span>
                <span>{value.toFixed(1)}</span>
              </div>
              <div className="result-panel__bar">
                <div
                  className="result-panel__bar-fill"
                  style={{ width: `${Math.min(Math.max(value / max, 0), 1) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <button className="result-panel__restart" onClick={onRestart}>
          Restart
        </button>
      </div>
    </div>
  );
};

export default ResultPanel;
