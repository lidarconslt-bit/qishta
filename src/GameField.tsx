import { useEffect, useRef, useState } from "react";
import { useGameLoop } from "./useGameLoop";
import { Ground } from "./components/Ground";
import { getActiveStage } from "./stages";

interface GameFieldProps {
  startElapsedMs: number;
  onGameOver: (score: number, elapsedMs: number) => void;
}

export function GameField({ startElapsedMs, onGameOver }: GameFieldProps) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const basketRef = useRef<HTMLDivElement>(null);
  const basketEmojiRef = useRef<HTMLDivElement>(null);
  const heartsWrapRef = useRef<HTMLDivElement>(null);
  const scoreElRef = useRef<HTMLDivElement>(null);
  const [score, setScore] = useState(0);
  const [hearts, setHearts] = useState(3);

  useGameLoop({
    fieldRef,
    basketRef,
    basketEmojiRef,
    heartsWrapRef,
    startElapsedMs,
    stage: getActiveStage(),
    onScoreChange: setScore,
    onHeartsChange: setHearts,
    onGameOver,
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
        <div className="basket__emoji" ref={basketEmojiRef}>
          🧺
        </div>
      </div>
    </div>
  );
}
