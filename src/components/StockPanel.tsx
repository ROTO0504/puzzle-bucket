import { useMemo } from "react";
import { useGameStore } from "../store/useGameStore";
import type { ItemSpec } from "../types";
import { MAX_STOCK } from "../config";

const StockPanel = () => {
  const stock = useGameStore((s) => s.stock);
  const catalog = useGameStore((s) => s.itemsCatalog);
  const remaining = Math.max(MAX_STOCK - stock.length, 0);

  const byId = useMemo(() => {
    const map = new Map<string, ItemSpec>();
    catalog.forEach((it) => map.set(it.id, it));
    return map;
  }, [catalog]);

  if (!stock) return null;

  const specs = stock.map((id) => byId.get(id)).filter(Boolean) as ItemSpec[];
  const useStockAt = useGameStore((s) => s.actions.useStockAt);

  return (
    <div className="stock">
      <div className="stock__card">
        <div className="stock__header">
          <span>キープ</span>
          <span className="stock__remain">残り {remaining}</span>
        </div>
        <div className="stock__list">
          {specs.length === 0 && <div className="stock__empty">なし</div>}
          {specs.map((spec, i) => (
            <button key={`${spec.id}-${i}`} className="stock__chip" title={spec.name} onClick={() => useStockAt(i)}>
              <span className="stock__dot" style={{ background: spec.fragile ? "#ffb49d" : "#9dc5ff" }} />
              <span className="stock__text">{spec.name}</span>
              <span className="stock__use">使う</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StockPanel;
