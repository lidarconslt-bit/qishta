import { useState } from "react";
import { shareText } from "./share";
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

export function GameOverScreen({ score, bestScore, isNewBest, onPlayAgain }: GameOverScreenProps) {
  const [shareState, setShareState] = useState<ShareState>("idle");

  const handleShare = async () => {
    const text = `سجّلت ${score} نقطة في لعبة التقاط الفواكه من قشطة! 🍉`;
    const outcome = await shareText(text);
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
        <div className="game-over__score">{score}</div>
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
