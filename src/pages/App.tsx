import { useEffect, useMemo } from "react";
import CanvasStage from "../components/CanvasStage";
import HUD from "../components/HUD";
import ResultPanel from "../components/ResultPanel";
import { useGameStore } from "../store/useGameStore";

const App = () => {
  const phase = useGameStore((state) => state.phase);
  const score = useGameStore((state) => state.score);
  const pendingScore = useGameStore((state) => state.pendingScore);
  const { restart, requestScoring, rotateGhostYaw, rotateGhostPitch, placeGhost, tick } = useGameStore(
    (state) => state.actions,
  );

  const resultScore = useMemo(() => score ?? pendingScore, [score, pendingScore]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      switch (event.key.toLowerCase()) {
        case "enter":
          requestScoring();
          break;
        case "r":
          restart();
          break;
        case "q":
          rotateGhostYaw(-1);
          break;
        case "e":
          rotateGhostYaw(1);
          break;
        case "w":
          rotateGhostPitch(-1);
          break;
        case "s":
          rotateGhostPitch(1);
          break;
        case " ":
          event.preventDefault();
          placeGhost();
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [placeGhost, requestScoring, restart, rotateGhostPitch, rotateGhostYaw]);

  useEffect(() => {
    if (phase !== "placing") return;
    let animationFrame = 0;
    let lastTime = performance.now();

    const step = (timestamp: number) => {
      const delta = timestamp - lastTime;
      lastTime = timestamp;
      tick(delta);
      if (useGameStore.getState().phase === "placing") {
        animationFrame = requestAnimationFrame(step);
      }
    };

    animationFrame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrame);
  }, [phase, tick]);

  return (
    <div className="app-shell">
      <CanvasStage />
      <HUD />
      {phase === "results" && resultScore && (
        <ResultPanel score={resultScore} onRestart={restart} />
      )}
    </div>
  );
};

export default App;
