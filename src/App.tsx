import { useCallback, useEffect, useRef, useState } from "react";
import { GameField } from "./GameField";
import { GameOverScreen } from "./GameOverScreen";
import { Splash } from "./components/Splash";

const BEST_SCORE_KEY = "qishta-fruit-catch-best-score";
const REPLAY_DIFFICULTY_CARRY = 0.8;
const SPLASH_VISIBLE_MS = 1300;
const SPLASH_FADE_MS = 350;

function loadBestScore(): number {
  const raw = localStorage.getItem(BEST_SCORE_KEY);
  const parsed = raw ? Number.parseInt(raw, 10) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

interface RoundResult {
  score: number;
  isNewBest: boolean;
}

type SplashPhase = "visible" | "hiding" | "done";

export default function App() {
  const [sessionId, setSessionId] = useState(0);
  const [bestScore, setBestScore] = useState(loadBestScore);
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const [splashPhase, setSplashPhase] = useState<SplashPhase>("visible");
  const lastElapsedRef = useRef(0);

  useEffect(() => {
    const hideTimer = window.setTimeout(() => setSplashPhase("hiding"), SPLASH_VISIBLE_MS);
    const doneTimer = window.setTimeout(() => setSplashPhase("done"), SPLASH_VISIBLE_MS + SPLASH_FADE_MS);
    return () => {
      window.clearTimeout(hideTimer);
      window.clearTimeout(doneTimer);
    };
  }, []);

  const handleGameOver = useCallback(
    (score: number, elapsedMs: number) => {
      lastElapsedRef.current = elapsedMs;
      const isNewBest = score > bestScore;
      if (isNewBest) {
        setBestScore(score);
        localStorage.setItem(BEST_SCORE_KEY, String(score));
      }
      setRoundResult({ score, isNewBest });
    },
    [bestScore],
  );

  const handlePlayAgain = useCallback(() => {
    setRoundResult(null);
    setSessionId((id) => id + 1);
  }, []);

  return (
    <div className="app">
      {splashPhase !== "done" ? (
        <Splash hiding={splashPhase === "hiding"} />
      ) : roundResult ? (
        <GameOverScreen
          score={roundResult.score}
          bestScore={bestScore}
          isNewBest={roundResult.isNewBest}
          onPlayAgain={handlePlayAgain}
        />
      ) : (
        <GameField
          key={sessionId}
          startElapsedMs={lastElapsedRef.current * REPLAY_DIFFICULTY_CARRY}
          onGameOver={handleGameOver}
        />
      )}
    </div>
  );
}
