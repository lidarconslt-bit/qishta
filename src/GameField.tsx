import { useEffect, useRef, useState } from "react";
import { useGameLoop } from "./useGameLoop";
import { Ground } from "./components/Ground";
import { getStage } from "./stages";

interface GameFieldProps {
  startElapsedMs: number;
  startScore: number;
  startHearts: number;
  stageIndex: number;
  onGameOver: (score: number, elapsedMs: number) => void;
  onStageComplete: (score: number, hearts: number, elapsedMs: number) => void;
}

export function GameField({
  startElapsedMs,
  startScore,
  startHearts,
  stageIndex,
  onGameOver,
  onStageComplete,
}: GameFieldProps) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const basketRef = useRef<HTMLDivElement>(null);
  const basketEmojiRef = useRef<HTMLDivElement>(null);
  const heartsWrapRef = useRef<HTMLDivElement>(null);
  const scoreElRef = useRef<HTMLDivElement>(null);
  const [score, setScore] = useState(startScore);
  const [hearts, setHearts] = useState(startHearts);

  useGameLoop({
    fieldRef,
    basketRef,
    basketEmojiRef,
    heartsWrapRef,
    startElapsedMs,
    startScore,
    startHearts,
    stage: getStage(stageIndex),
    onScoreChange: setScore,
    onHeartsChange: setHearts,
    onGameOver,
    onStageComplete,
  });

  useEffect(() => {
    if (score === 0) return;
    const el = scoreElRef.current;
    if (!el) return;
    el.classList.remove("hud__score--bump");
    void el.offsetWidth;
    el.classList.add("hud__score--bump");
  }, [score]);

  return (
    <div className="game-field" ref={fieldRef}>
      <Ground />
      <div className="hud">
        <div className="hud__score" ref={scoreElRef}>
          {score}
        </div>
        <div className="hud__hearts" ref={heartsWrapRef}>
          {[0, 1, 2].map((i) => (
            <span key={i} className="heart">
              {i < hearts ? "❤️" : "🤍"}
            </span>
          ))}
        </div>
      </div>
      <div className="basket" ref={basketRef}>
        <div className="basket__aura" aria-hidden="true" />
        <div className="basket__emoji" ref={basketEmojiRef}>
          🧺
        </div>
      </div>
    </div>
  );
}
