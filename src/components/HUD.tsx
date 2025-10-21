import { useMemo } from "react";
import { useGameStore, BASKET_DIMENSIONS } from "../store/useGameStore";
import { computeCenterOfMass } from "../logic/placement/com";
import { computeBalanceScore } from "../logic/scoring/computeBalance";
import { getVolume } from "../logic/placement/orientation";

const formatTime = (ms: number) => {
  const totalSeconds = Math.max(Math.ceil(ms / 1000), 0);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(1, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
};

const HUD = () => {
  const phase = useGameStore((state) => state.phase);
  const timeRemainingMs = useGameStore((state) => state.timeRemainingMs);
  const totalDurationMs = useGameStore((state) => state.totalDurationMs);
  const queue = useGameStore((state) => state.queue);
  const placedInstances = useGameStore((state) => state.placedInstances);
  const totalVoxels = useGameStore((state) => state.totalVoxels);
  const requestScoring = useGameStore((state) => state.actions.requestScoring);

  const timeLabel = useMemo(() => formatTime(timeRemainingMs), [timeRemainingMs]);
  const progress = useMemo(() => {
    const ratio = 1 - timeRemainingMs / totalDurationMs;
    if (!Number.isFinite(ratio)) return 0;
    return Math.min(Math.max(ratio, 0), 1);
  }, [timeRemainingMs, totalDurationMs]);
  const occupancy = useMemo(() => {
    if (totalVoxels <= 0) return 0;
    const occupied = placedInstances.reduce((sum, item) => sum + getVolume(item.spec), 0);
    return Math.min(occupied / totalVoxels, 1);
  }, [placedInstances, totalVoxels]);
  const occupancyPercentage = useMemo(() => Math.round(occupancy * 100), [occupancy]);

  const centerOfMass = useMemo(() => {
    if (placedInstances.length === 0) {
      return { offsetRatio: 0 };
    }
    const com = computeCenterOfMass(placedInstances);
    if (com.totalMass === 0) {
      return { offsetRatio: 0 };
    }
    const balance = computeBalanceScore({
      centerOfMass: { x: com.x, z: com.z },
      basketSize: { width: BASKET_DIMENSIONS.width, depth: BASKET_DIMENSIONS.depth },
    });
    return { offsetRatio: balance.offset };
  }, [placedInstances]);

  return (
    <div className="hud">
      <div className="hud__panel">
        <div className="hud__timer">
          <span className="hud__label">Time</span>
          <span className="hud__value">{timeLabel}</span>
          <div className="hud__progress">
            <div className="hud__progress-fill" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
        <div className="hud__stat">
          <span className="hud__label">Items</span>
          <span className="hud__value">{queue.length} left</span>
        </div>
        <div className="hud__stat">
          <span className="hud__label">Occupancy</span>
          <span className="hud__value">{occupancyPercentage}%</span>
        </div>
        <div className="hud__stat">
          <span className="hud__label">COM Offset</span>
          <div className="hud__com-bar">
            <div className="hud__com-indicator" style={{ left: `${50 + centerOfMass.offsetRatio * 50}%` }} />
          </div>
        </div>
      </div>
      <div className="hud__actions">
        <button
          className="hud__score-btn"
          onClick={requestScoring}
          disabled={phase !== "placing" || queue.length !== 0}
        >
          {queue.length === 0 ? "Score (Enter)" : "Place all items"}
        </button>
      </div>
      <div className="hud__hint">
        Drag or Arrow keys to move • Click/Space to place • Q,E yaw • W,S pitch • A,D roll • F keep • R undo • Shift+R restart
      </div>
    </div>
  );
};

export default HUD;
