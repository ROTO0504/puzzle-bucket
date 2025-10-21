import { useGameStore } from "../store/useGameStore";

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
};

export default ControlsHelp;

