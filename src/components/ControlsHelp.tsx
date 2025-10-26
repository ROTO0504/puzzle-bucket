/*import { useGameStore } from "../store/useGameStore";

const ControlsHelp = () => {
  const phase = useGameStore((s) => s.phase);
  if (phase !== "placing") return null;

  return (
    <div className="help-panel">
      <div className="help-panel__card">
        <h3 className="help-panel__title">操作説明</h3>
        <div className="help-panel__list">
          <div className="help-panel__row"><span className="help-panel__label">移動</span><span className="help-panel__keys">ドラッグ / ← → ↑ ↓</span></div>
          <div className="help-panel__row"><span className="help-panel__label">設置</span><span className="help-panel__keys">クリック / Space</span></div>
          <div className="help-panel__row"><span className="help-panel__label">回転（ヨー）</span><span className="help-panel__keys">Q / E</span></div>
          <div className="help-panel__row"><span className="help-panel__label">回転（ピッチ）</span><span className="help-panel__keys">W / S</span></div>
          <div className="help-panel__row"><span className="help-panel__label">回転（ロール）</span><span className="help-panel__keys">A / D</span></div>
          <div className="help-panel__row"><span className="help-panel__label">キープ</span><span className="help-panel__keys">F</span></div>
          <div className="help-panel__row"><span className="help-panel__label">ひとつ戻す</span><span className="help-panel__keys">R</span></div>
          <div className="help-panel__row"><span className="help-panel__label">最初から</span><span className="help-panel__keys">Shift + R</span></div>
          <div className="help-panel__row"><span className="help-panel__label">採点</span><span className="help-panel__keys">Enter（全て置いたら）</span></div>
        </div>
      </div>
    </div>
  );
};*/
// src/components/ControlsHelp.tsx
import { useState } from "react";
import { useGameStore } from "../store/useGameStore";

type ControlsHelpProps = {
  alwaysShow?: boolean; // スタート画面で常時表示したい場合
};

export const ControlsHelp: React.FC<ControlsHelpProps> = ({ alwaysShow }) => {
  const phase = useGameStore((s) => s.phase);
  const [open, setOpen] = useState(alwaysShow || false);

  // ゲーム中は配置フェーズのみ表示
  if (!alwaysShow && phase !== "placing") return null;

  // 位置はスタート画面では固定せず、ゲーム中は右下
  const containerStyle: React.CSSProperties = {
    position: alwaysShow ? "relative" : "absolute",
    bottom: alwaysShow ? undefined : 16,
    right: alwaysShow ? undefined : 16,
    zIndex: 100,
  };

  return (
    <div style={containerStyle} className="help-panel">
      <button
        onClick={() => setOpen(!open)}
        className="help-panel__toggle"
        style={{
          padding: "6px 10px",
          borderRadius: 8,
          backgroundColor: "#4DA3FF",
          color: "#FFF",
          border: "none",
          cursor: "pointer",
          fontWeight: "bold",
          marginBottom: 4,
        }}
      >
        {open ? "× 操作説明を閉じる" : "操作説明"}
      </button>

      {open && (
        <div className="help-panel__card" style={{ padding: 12 }}>
          <h3 className="help-panel__title">操作説明</h3>
          <div className="help-panel__list" style={{ fontFamily: "monospace", fontSize: 12, lineHeight: 1.4 }}>
            <div className="help-panel__row"><span className="help-panel__label">移動</span><span className="help-panel__keys">ドラッグ / ← → ↑ ↓</span></div>
            <div className="help-panel__row"><span className="help-panel__label">設置</span><span className="help-panel__keys">クリック / Space</span></div>
            <div className="help-panel__row"><span className="help-panel__label">回転（ヨー）</span><span className="help-panel__keys">Q / E</span></div>
            <div className="help-panel__row"><span className="help-panel__label">回転（ピッチ）</span><span className="help-panel__keys">W / S</span></div>
            <div className="help-panel__row"><span className="help-panel__label">回転（ロール）</span><span className="help-panel__keys">A / D</span></div>
            <div className="help-panel__row"><span className="help-panel__label">キープ</span><span className="help-panel__keys">F</span></div>
            <div className="help-panel__row"><span className="help-panel__label">ひとつ戻す</span><span className="help-panel__keys">R</span></div>
            <div className="help-panel__row"><span className="help-panel__label">最初から</span><span className="help-panel__keys">Shift + R</span></div>
            <div className="help-panel__row"><span className="help-panel__label">採点</span><span className="help-panel__keys">Enter（全て置いたら）</span></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ControlsHelp;

