import { useCallback, useEffect, useRef, useState } from "react";
import { GameField } from "./GameField";
import { GameOverScreen } from "./GameOverScreen";
import { Splash } from "./components/Splash";
import { StageCompleteOverlay } from "./components/StageCompleteOverlay";

const BEST_SCORE_KEY = "qishta-fruit-catch-best-score";
const REPLAY_DIFFICULTY_CARRY = 0.8;
const SPLASH_VISIBLE_MS = 950;
const SPLASH_FADE_MS = 300;
const STAGE_COMPLETE_DELAY_MS = 2000;

function loadBestScore(): number {
  const raw = localStorage.getItem(BEST_SCORE_KEY);
  const parsed = raw ? Number.parseInt(raw, 10) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

interface RoundResult {
  score: number;
  isNewBest: boolean;
}

interface RoundStart {
  score: number;
  hearts: number;
  elapsedMs: number;
}

type SplashPhase = "visible" | "hiding" | "done";

export default function App() {
  const [sessionId, setSessionId] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const [bestScore, setBestScore] = useState(loadBestScore);
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const [stageComplete, setStageComplete] = useState(false);
  const [splashPhase, setSplashPhase] = useState<SplashPhase>("visible");
  const nextRoundRef = useRef<RoundStart>({ score: 0, hearts: 3, elapsedMs: 0 });

  useEffect(() => {
    const hideTimer = window.setTimeout(() => setSplashPhase("hiding"), SPLASH_VISIBLE_MS);
    const doneTimer = window.setTimeout(() => setSplashPhase("done"), SPLASH_VISIBLE_MS + SPLASH_FADE_MS);
    return () => {
      window.clearTimeout(hideTimer);
      window.clearTimeout(doneTimer);
    };
  }, []);

  useEffect(() => {
    if (!stageComplete) return;
    const timer = window.setTimeout(() => {
      setStageComplete(false);
      setStageIndex((index) => index + 1);
      setSessionId((id) => id + 1);
    }, STAGE_COMPLETE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [stageComplete]);

  const handleGameOver = useCallback(
    (score: number, elapsedMs: number) => {
      nextRoundRef.current = { score: 0, hearts: 3, elapsedMs: elapsedMs * REPLAY_DIFFICULTY_CARRY };
      const isNewBest = score > bestScore;
      if (isNewBest) {
        setBestScore(score);
        localStorage.setItem(BEST_SCORE_KEY, String(score));
      }
      setRoundResult({ score, isNewBest });
    },
    [bestScore],
  );

  const handleStageComplete = useCallback((score: number, hearts: number, elapsedMs: number) => {
    nextRoundRef.current = { score, hearts, elapsedMs };
    setStageComplete(true);
  }, []);

  const handlePlayAgain = useCallback(() => {
    setRoundResult(null);
    setStageIndex(0);
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
      ) : stageComplete ? (
        <StageCompleteOverlay />
      ) : (
        <GameField
          key={sessionId}
          startElapsedMs={nextRoundRef.current.elapsedMs}
          startScore={nextRoundRef.current.score}
          startHearts={nextRoundRef.current.hearts}
          stageIndex={stageIndex}
          onGameOver={handleGameOver}
          onStageComplete={handleStageComplete}
        />
      )}
    </div>
  );
}
