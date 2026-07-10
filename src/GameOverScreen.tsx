import { useEffect, useRef, useState } from "react";
import { shareResult } from "./share";
import { Button } from "./components/Button";
import { BrandLogo } from "./components/BrandLogo";
import { ReplayIcon, ShareIcon } from "./components/icons";

interface GameOverScreenProps {
  score: number;
  bestScore: number;
  isNewBest: boolean;
  onPlayAgain: () => void;
}

type ShareState = "idle" | "shared" | "copied" | "unavailable";

const SHARE_LABELS: Record<ShareState, string> = {
  idle: "مشاركة",
  shared: "تمت المشاركة ✓",
  copied: "تم نسخ النتيجة ✓",
  unavailable: "تعذّرت المشاركة",
};

const COUNT_UP_DELAY_MS = 280;
const COUNT_UP_DURATION_MS = 650;

function useCountUpScore(target: number): { value: number; settled: boolean } {
  const [value, setValue] = useState(0);
  const [settled, setSettled] = useState(target <= 0);

  useEffect(() => {
    if (target <= 0) {
      setValue(0);
      setSettled(true);
      return;
    }
    let rafId = 0;
    let startTime = 0;
    const startTimer = window.setTimeout(() => {
      const tick = (now: number) => {
        if (!startTime) startTime = now;
        const progress = Math.min(1, (now - startTime) / COUNT_UP_DURATION_MS);
        const eased = 1 - (1 - progress) ** 3;
        setValue(Math.round(target * eased));
        if (progress < 1) {
          rafId = requestAnimationFrame(tick);
        } else {
          setSettled(true);
        }
      };
      rafId = requestAnimationFrame(tick);
    }, COUNT_UP_DELAY_MS);
    return () => {
      window.clearTimeout(startTimer);
      cancelAnimationFrame(rafId);
    };
  }, [target]);

  return { value, settled };
}

export function GameOverScreen({ score, bestScore, isNewBest, onPlayAgain }: GameOverScreenProps) {
  const [shareState, setShareState] = useState<ShareState>("idle");
  const { value: displayScore, settled } = useCountUpScore(score);
  const scoreElRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!settled) return;
    scoreElRef.current?.classList.add("game-over__score--settled");
  }, [settled]);

  const handleShare = async () => {
    const text = `🎮 سجّلت ${score} نقطة في قشطة!\n\nهل تقدر تتفوق على نتيجتي؟`;
    const outcome = await shareResult(text, window.location.href);
    if (outcome === "cancelled") return;
    setShareState(outcome);
    window.setTimeout(() => setShareState("idle"), 1800);
  };

  return (
    <div className="game-over">
      <div className="game-over__card">
        <BrandLogo width={200} className="game-over__logo" />
        {isNewBest && <div className="game-over__badge">🎉 رقم قياسي جديد</div>}
        <h1 className="game-over__title">انتهت اللعبة</h1>
        <div className="game-over__score" ref={scoreElRef}>
          {displayScore}
        </div>
        <div className="game-over__best">أفضل نتيجة: {bestScore}</div>
        <div className="game-over__actions">
          <Button variant="primary" icon={<ReplayIcon />} onClick={onPlayAgain}>
            العب مرة أخرى
          </Button>
          <Button variant="secondary" icon={<ShareIcon />} onClick={handleShare}>
            {SHARE_LABELS[shareState]}
          </Button>
        </div>
      </div>
    </div>
  );
}
