import React, { useState } from "react";
import { useGameStore } from "../store/useGameStore";

type ControlsHelpProps = {
  alwaysShow?: boolean; // スタート画面用に常時表示
};

const ControlsHelp: React.FC<ControlsHelpProps> = ({ alwaysShow }) => {
  const phase = useGameStore((s) => s.phase);
  // スタート画面なら常に開いた状態でマウントされる想定なので true にする
  const [open, setOpen] = useState(alwaysShow || false);

  // ゲーム中は配置フェーズのみ表示
  if (!alwaysShow && phase !== "placing") return null;

  // class で位置を切り替える（CSS に .help-panel--fixed / --inline を定義）
  const className = `help-panel ${alwaysShow ? "help-panel--fixed" : "help-panel--inline"}`;

  return (
    <div className={className}>
      {/* スタート画面(alwaysShow) の場合は、StartScreen 側の「操作説明を見る」ボタンで開閉しているはずなので
          内部のトグル（特に「閉じる」ボタン）は表示しない。ゲーム中はトグルを表示して開閉を行う。 */}
      {!alwaysShow && (
        <button
          onClick={() => setOpen(!open)}
          className="help-panel__toggle"
        >
          {open ? "× 操作説明を閉じる" : "操作説明"}
        </button>
      )}

      {/* スタート画面ではマウント時に open が true の想定、ゲーム中はトグルで open を切り替える */}
      {open && (
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
      )}
    </div>
  );
};

export default ControlsHelp;