import { useEffect } from "react";
import CanvasStage from "../components/CanvasStage";
import HUD from "../components/HUD";
import CurrentItemPanel from "../components/CurrentItemPanel";
import QueuePanel from "../components/QueuePanel";
import StockPanel from "../components/StockPanel";
import StartScreen from "../components/StartScreen";
import EndScreen from "../components/EndScreen";
import Leaderboard from "../components/Leaderboard";
import StuckButton from "../components/StuckButton";
import { useGameStore } from "../store/useGameStore";

const App = () => {
  const phase = useGameStore((state) => state.phase);
  const { restart, requestScoring, rotateGhostYaw, rotateGhostPitch, placeGhost, tick, moveGhostBy, undoLastPlacement, holdCurrent, rotateGhostRoll } = useGameStore(
    (state) => state.actions,
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      // Disable shortcuts outside placing phase
      if (useGameStore.getState().phase !== "placing") return;
      switch (event.key.toLowerCase()) {
        case "enter":
          // Only score when all items placed and still in placing phase
          if (useGameStore.getState().phase === "placing" && useGameStore.getState().queue.length === 0) {
            requestScoring();
          }
          break;
        case "arrowleft":
          event.preventDefault();
          moveGhostBy(-1, 0);
          break;
        case "arrowright":
          event.preventDefault();
          moveGhostBy(1, 0);
          break;
        case "arrowup":
          event.preventDefault();
          moveGhostBy(0, -1);
          break;
        case "arrowdown":
          event.preventDefault();
          moveGhostBy(0, 1);
          break;
        case "r":
          if (event.shiftKey) {
            // Shift+R: Restart
            restart();
          } else {
            // R: Undo last placement
            undoLastPlacement();
          }
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
        case "a":
          rotateGhostRoll(-1);
          break;
        case "d":
          rotateGhostRoll(1);
          break;
        case " ":
          event.preventDefault();
          placeGhost();
          break;
        case "f":
          event.preventDefault();
          holdCurrent();
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [holdCurrent, moveGhostBy, placeGhost, requestScoring, restart, rotateGhostPitch, rotateGhostYaw]);

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
      {phase === "placing" && (
        <>
          <QueuePanel />
          <StockPanel />
          <CurrentItemPanel />
          <HUD />
          <StuckButton />
        </>
      )}
      {phase === "start" && <StartScreen />}
      {phase === "results" && <EndScreen />}
      {phase === "leaderboard" && <Leaderboard />}
    </div>
  );
};

export default App;
