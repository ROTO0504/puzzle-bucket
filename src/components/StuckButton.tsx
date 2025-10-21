import { useGameStore } from "../store/useGameStore";

const StuckButton = () => {
  const requestScoring = useGameStore((s) => s.actions.requestScoring);
  const phase = useGameStore((s) => s.phase);
  if (phase !== "placing") return null;
  return (
    <div className="stuck">
      <button className="stuck__btn" onClick={requestScoring}>
        詰みなら終了
      </button>
    </div>
  );
};

export default StuckButton;
