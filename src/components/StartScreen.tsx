import { useGameStore } from "../store/useGameStore";

const StartScreen = () => {
  const startGame = useGameStore((s) => s.actions.startGame);
  const goToLeaderboard = useGameStore((s) => s.actions.goToLeaderboard);
  return (
    <div className="overlay overlay--center">
      <div className="card card--lg">
        <h1 className="overlay__title">Puzzle Bucket</h1>
        <p className="overlay__desc">アイテムをうまく積んで高得点を目指そう！</p>
        <div className="actions">
          <button className="btn" onClick={goToLeaderboard}>ランキング</button>
          <button className="btn btn--primary" onClick={startGame}>Start</button>
        </div>
      </div>
    </div>
  );
};

export default StartScreen;
