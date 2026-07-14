import { useEffect, useRef, type RefObject } from "react";
import { playSound } from "./sound";
import { comboFeel } from "./combo";
import type { SpecialFruit, StageConfig } from "./stages";

const FRUIT_EMOJIS = ["🍎", "🍌", "🍇", "🍉", "🍒", "🍑", "🍓", "🥝", "🍍", "🍊"];

// Guaranteed-first-watermelon window (stage 1). The upper bound sits below 20s
// so that even the ~1 spawn-interval delay before the forced fruit lands keeps
// the first watermelon comfortably inside a 10-20s playtest window.
const WATERMELON_EMOJI = "🍉";
const WATERMELON_MIN_MS = 10000;
const WATERMELON_MAX_MS = 18000;

const RAMP_DURATION_SEC = 45;
const BASE_FALL_SPEED = 110; // px/s
const MAX_FALL_SPEED = 370; // px/s

const BASE_SPAWN_INTERVAL_MS = 1150;
const MIN_SPAWN_INTERVAL_MS = 430;

const BASKET_WIDTH_RATIO = 0.24;
const BASKET_MIN_WIDTH = 68;
const BASKET_MAX_WIDTH = 118;

const FRUIT_RADIUS = 20;
const CATCH_FORGIVENESS = 10;
const CATCH_BAND_HEIGHT = 28;

const KEY_SPEED = 560; // px/s
const BASKET_STIFFNESS = 240;
const BASKET_DAMPING = 27;

const MAX_DT = 0.05;
const START_DELAY_MS = 350;

const SPAWN_ZONE_COUNT = 3;
const MIN_SPAWN_GAP = 70; // px, minimum horizontal distance from the previous spawn
const PARTICLE_COLORS = ["accent", "pink", "mint"] as const;
const PARTICLE_COUNT = 6;
const SPECIAL_PARTICLE_COUNT = 9;
const CATCH_BURST_DELAY_MS = 40;
const FLOATING_SCORE_DELAY_MS = 70;

function smoothstep(x: number): number {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}

function randomSpecialInterval(fruit: SpecialFruit, isFirst: boolean): number {
  const min = isFirst ? (fruit.firstMinIntervalMs ?? fruit.minIntervalMs) : fruit.minIntervalMs;
  const max = isFirst ? (fruit.firstMaxIntervalMs ?? fruit.maxIntervalMs) : fruit.maxIntervalMs;
  return min + Math.random() * (max - min);
}

interface FruitEntity {
  el: HTMLDivElement;
  inner: HTMLDivElement;
  x: number;
  y: number;
  vy: number;
  state: "falling" | "caught" | "missed";
  points: number;
  special: boolean;
}

interface UseGameLoopOptions {
  fieldRef: RefObject<HTMLDivElement | null>;
  basketRef: RefObject<HTMLDivElement | null>;
  basketEmojiRef: RefObject<HTMLDivElement | null>;
  heartsWrapRef: RefObject<HTMLDivElement | null>;
  startElapsedMs: number;
  startScore: number;
  startHearts: number;
  stage: StageConfig;
  onScoreChange: (score: number) => void;
  onHeartsChange: (hearts: number) => void;
  onGameOver: (finalScore: number, elapsedMs: number) => void;
  onStageComplete: (score: number, hearts: number, elapsedMs: number) => void;
}

export function useGameLoop({
  fieldRef,
  basketRef,
  basketEmojiRef,
  heartsWrapRef,
  startElapsedMs,
  startScore,
  startHearts,
  stage,
  onScoreChange,
  onHeartsChange,
  onGameOver,
  onStageComplete,
}: UseGameLoopOptions): void {
  const onScoreChangeRef = useRef(onScoreChange);
  const onHeartsChangeRef = useRef(onHeartsChange);
  const onGameOverRef = useRef(onGameOver);
  const onStageCompleteRef = useRef(onStageComplete);
  onScoreChangeRef.current = onScoreChange;
  onHeartsChangeRef.current = onHeartsChange;
  onGameOverRef.current = onGameOver;
  onStageCompleteRef.current = onStageComplete;

  useEffect(() => {
    const field = fieldRef.current;
    const basket = basketRef.current;
    if (!field || !basket) return;

    let rafId = 0;
    let lastTime = 0;
    let elapsedMs = startElapsedMs;
    let spawnTimerMs = START_DELAY_MS;
    let score = startScore;
    let hearts = startHearts;
    let fruitsCaughtInStage = 0;
    let streak = 0;
    let gameOver = false;
    let basketWidth = 84;
    let targetX = 0;
    let currentX = 0;
    let basketVx = 0;
    let initialized = false;
    let pointerActive = false;
    let lastSpawnZone = -1;
    let secondLastSpawnZone = -1;
    let lastSpawnX = -1;
    let lastEmojiIndex = -1;
    // First-watermelon guarantee (stage 1 only): the watermelon is one of the
    // ordinary random fruits, so on its own it might not show up early in a
    // playtest. We arm a wall-clock countdown (measured from this run, not the
    // difficulty clock which is pre-aged on replays) and, if no watermelon has
    // appeared naturally by then, force the next regular fruit to be one. This
    // keeps the first watermelon inside a 10-20s window without touching pacing.
    let watermelonCountdownMs =
      stage.id === 1 ? WATERMELON_MIN_MS + Math.random() * (WATERMELON_MAX_MS - WATERMELON_MIN_MS) : Infinity;
    let watermelonGuaranteed = stage.id !== 1;
    let forceWatermelonNext = false;
    const specialFruits = stage.specialFruits;
    const specialTimers = specialFruits.map((fruit) => randomSpecialInterval(fruit, true));
    const keys = { left: false, right: false };
    const entities: FruitEntity[] = [];

    const clampBasketX = (x: number, fieldWidth: number) => {
      const half = basketWidth / 2;
      return Math.min(fieldWidth - half, Math.max(half, x));
    };

    const handlePointerDown = (e: PointerEvent) => {
      pointerActive = true;
      basket.setPointerCapture(e.pointerId);
      const rect = field.getBoundingClientRect();
      targetX = clampBasketX(e.clientX - rect.left, rect.width);
    };
    const handlePointerMove = (e: PointerEvent) => {
      if (!pointerActive) return;
      const rect = field.getBoundingClientRect();
      targetX = clampBasketX(e.clientX - rect.left, rect.width);
    };
    const handlePointerUp = () => {
      pointerActive = false;
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = true;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = false;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = false;
    };

    field.addEventListener("pointerdown", handlePointerDown);
    field.addEventListener("pointermove", handlePointerMove);
    field.addEventListener("pointerup", handlePointerUp);
    field.addEventListener("pointercancel", handlePointerUp);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    const difficultyProgress = () =>
      smoothstep((elapsedMs / 1000 / RAMP_DURATION_SEC) * stage.difficultyMultiplier);

    const currentFallSpeed = () =>
      BASE_FALL_SPEED + (MAX_FALL_SPEED - BASE_FALL_SPEED) * difficultyProgress();

    const currentSpawnInterval = () =>
      BASE_SPAWN_INTERVAL_MS - (BASE_SPAWN_INTERVAL_MS - MIN_SPAWN_INTERVAL_MS) * difficultyProgress();

    const pickSpawnX = (fieldWidth: number): number => {
      const zoneWidth = fieldWidth / SPAWN_ZONE_COUNT;
      const weights = Array.from({ length: SPAWN_ZONE_COUNT }, (_, zone) => {
        if (zone === lastSpawnZone) return 1;
        if (zone === secondLastSpawnZone) return 2;
        return 3;
      });
      const totalWeight = weights.reduce((sum, w) => sum + w, 0);
      let roll = Math.random() * totalWeight;
      let zone = SPAWN_ZONE_COUNT - 1;
      for (let i = 0; i < SPAWN_ZONE_COUNT; i += 1) {
        if (roll < weights[i]) {
          zone = i;
          break;
        }
        roll -= weights[i];
      }
      secondLastSpawnZone = lastSpawnZone;
      lastSpawnZone = zone;

      const zoneStart = zone * zoneWidth;
      const min = Math.max(FRUIT_RADIUS, zoneStart);
      const max = Math.min(fieldWidth - FRUIT_RADIUS, zoneStart + zoneWidth);

      let x = max > min ? min + Math.random() * (max - min) : min;
      if (lastSpawnX >= 0 && Math.abs(x - lastSpawnX) < MIN_SPAWN_GAP && max > min) {
        for (let attempt = 0; attempt < 2; attempt += 1) {
          const candidate = min + Math.random() * (max - min);
          if (Math.abs(candidate - lastSpawnX) > Math.abs(x - lastSpawnX)) {
            x = candidate;
          }
        }
      }
      lastSpawnX = x;
      return x;
    };

    const pickFruitEmoji = (): string => {
      if (forceWatermelonNext) {
        forceWatermelonNext = false;
        watermelonGuaranteed = true;
        lastEmojiIndex = FRUIT_EMOJIS.indexOf(WATERMELON_EMOJI);
        return WATERMELON_EMOJI;
      }
      let index = Math.floor(Math.random() * FRUIT_EMOJIS.length);
      if (index === lastEmojiIndex) {
        index = (index + 1 + Math.floor(Math.random() * (FRUIT_EMOJIS.length - 1))) % FRUIT_EMOJIS.length;
      }
      lastEmojiIndex = index;
      // A watermelon that shows up on its own satisfies the guarantee.
      if (FRUIT_EMOJIS[index] === WATERMELON_EMOJI) watermelonGuaranteed = true;
      return FRUIT_EMOJIS[index];
    };

    const spawnFruit = (fieldWidth: number, special: SpecialFruit | null = null) => {
      const el = document.createElement("div");
      el.className = "fruit";
      const inner = document.createElement("div");
      inner.className = special ? `fruit__emoji ${special.className}` : "fruit__emoji";
      inner.textContent = special ? special.emoji : pickFruitEmoji();
      el.appendChild(inner);
      field.appendChild(el);
      const x = pickSpawnX(fieldWidth);
      const vy = currentFallSpeed() * (0.88 + Math.random() * 0.24);
      entities.push({
        el,
        inner,
        x,
        y: -FRUIT_RADIUS,
        vy,
        state: "falling",
        points: special ? special.points : 1,
        special: special !== null,
      });
    };

    const spawnFloatingScore = (x: number, y: number, points: number, special: boolean) => {
      const wrapper = document.createElement("div");
      wrapper.className = "float-score";
      wrapper.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      const inner = document.createElement("div");
      inner.className = special ? "float-score__inner float-score__inner--special" : "float-score__inner";
      inner.textContent = `+${points}`;
      wrapper.appendChild(inner);
      field.appendChild(wrapper);
      window.setTimeout(() => wrapper.remove(), 240);
    };

    const spawnCatchBurst = (x: number, y: number, special: boolean, comboT = 0) => {
      const wrapper = document.createElement("div");
      wrapper.className = special ? "catch-burst catch-burst--special" : "catch-burst";
      wrapper.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      const ring = document.createElement("div");
      ring.className = "catch-burst__ring";
      // The ring grows gently with the combo. Sizing it inline (rather than a
      // new class per tier) keeps the escalation smooth and continuous.
      const ringSize = (special ? 66 : 48) * (1 + comboT * 0.4);
      ring.style.width = `${ringSize}px`;
      ring.style.height = `${ringSize}px`;
      ring.style.marginLeft = `${-ringSize / 2}px`;
      ring.style.marginTop = `${-ringSize / 2}px`;
      wrapper.appendChild(ring);
      const particleCount = (special ? SPECIAL_PARTICLE_COUNT : PARTICLE_COUNT) + Math.round(comboT * 4);
      const sparkleEvery = special ? 2 : 3;
      for (let i = 0; i < particleCount; i += 1) {
        const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5;
        const distance = (20 + Math.random() * 16) * (1 + comboT * 0.4);
        const isSparkle = i % sparkleEvery === sparkleEvery - 1;
        const particle = document.createElement("div");
        const colorClass = `catch-particle--${PARTICLE_COLORS[i % PARTICLE_COLORS.length]}`;
        particle.className = isSparkle
          ? `catch-particle catch-particle--sparkle ${colorClass}`
          : `catch-particle ${colorClass}`;
        particle.style.setProperty("--tx", `${Math.cos(angle) * distance}px`);
        particle.style.setProperty("--ty", `${Math.sin(angle) * distance}px`);
        wrapper.appendChild(particle);
      }
      field.appendChild(wrapper);
      window.setTimeout(() => wrapper.remove(), 400);
    };

    const pulseBasket = (className: string) => {
      const emoji = basketEmojiRef.current;
      if (!emoji) return;
      emoji.classList.remove(className);
      void emoji.offsetWidth;
      emoji.classList.add(className);
    };

    const pulseBasketImpact = () => {
      basket.classList.remove("basket--impact");
      void basket.offsetWidth;
      basket.classList.add("basket--impact");
    };

    const shakeScreen = () => {
      const stage = field.parentElement;
      if (!stage) return;
      stage.classList.remove("app--shake");
      void stage.offsetWidth;
      stage.classList.add("app--shake");
    };

    const triggerMissFeedback = () => {
      field.classList.remove("field--miss");
      void field.offsetWidth;
      field.classList.add("field--miss");
      const heartsWrap = heartsWrapRef.current;
      if (heartsWrap) {
        heartsWrap.classList.remove("hearts--shake");
        void heartsWrap.offsetWidth;
        heartsWrap.classList.add("hearts--shake");
      }
      pulseBasket("basket__emoji--miss");
    };

    const endGame = () => {
      gameOver = true;
      playSound("gameOver");
      onGameOverRef.current(score, elapsedMs);
    };

    const completeStage = () => {
      gameOver = true;
      onStageCompleteRef.current(score, hearts, elapsedMs);
    };

    const tick = (time: number) => {
      if (gameOver) return;
      if (!lastTime) lastTime = time;
      const dt = Math.min(MAX_DT, (time - lastTime) / 1000);
      lastTime = time;
      elapsedMs += dt * 1000;

      const rect = field.getBoundingClientRect();
      basketWidth = Math.min(
        BASKET_MAX_WIDTH,
        Math.max(BASKET_MIN_WIDTH, rect.width * BASKET_WIDTH_RATIO),
      );
      basket.style.width = `${basketWidth}px`;

      if (!initialized) {
        targetX = rect.width / 2;
        currentX = rect.width / 2;
        initialized = true;
      }

      if (keys.left) targetX -= KEY_SPEED * dt;
      if (keys.right) targetX += KEY_SPEED * dt;
      targetX = clampBasketX(targetX, rect.width);

      const springForce = BASKET_STIFFNESS * (targetX - currentX) - BASKET_DAMPING * basketVx;
      basketVx += springForce * dt;
      currentX += basketVx * dt;
      const clampedX = clampBasketX(currentX, rect.width);
      if (clampedX !== currentX) {
        currentX = clampedX;
        basketVx = 0;
      }
      basket.style.transform = `translate3d(${currentX - basketWidth / 2}px, 0, 0)`;

      if (!watermelonGuaranteed) {
        watermelonCountdownMs -= dt * 1000;
        if (watermelonCountdownMs <= 0) forceWatermelonNext = true;
      }

      spawnTimerMs -= dt * 1000;
      if (spawnTimerMs <= 0) {
        spawnFruit(rect.width);
        spawnTimerMs = currentSpawnInterval() * (0.85 + Math.random() * 0.3);
      }

      for (let i = 0; i < specialFruits.length; i += 1) {
        specialTimers[i] -= dt * 1000;
        if (specialTimers[i] <= 0) {
          spawnFruit(rect.width, specialFruits[i]);
          specialTimers[i] = randomSpecialInterval(specialFruits[i], false);
        }
      }

      const basketRect = basket.getBoundingClientRect();
      const basketCenterY = basketRect.top - rect.top + basketRect.height / 2;

      for (const entity of entities) {
        if (entity.state !== "falling") continue;
        entity.y += entity.vy * dt;
        entity.el.style.transform = `translate3d(${entity.x - FRUIT_RADIUS}px, ${entity.y - FRUIT_RADIUS}px, 0)`;

        const withinBand =
          entity.y >= basketCenterY - CATCH_BAND_HEIGHT && entity.y <= basketCenterY + CATCH_BAND_HEIGHT;
        const withinX = Math.abs(entity.x - currentX) <= basketWidth / 2 + CATCH_FORGIVENESS;

        if (withinBand && withinX) {
          entity.state = "caught";
          streak += 1;
          const feel = comboFeel(streak);
          entity.inner.style.setProperty("--pop-rotate", `${(Math.random() - 0.5) * 28}deg`);
          entity.inner.classList.add("fruit__emoji--caught");
          window.setTimeout(() => entity.el.remove(), 280);
          pulseBasket(entity.special ? "basket__emoji--date-catch" : "basket__emoji--catch");
          pulseBasketImpact();
          // Combo aura builds behind the basket as the streak grows (CSS
          // transitions the fade), giving the run a felt "state" between catches.
          basket.style.setProperty("--combo-glow", feel.glow.toFixed(3));
          if (entity.special) shakeScreen();
          // Haptics reinforce the impact on Android; iOS Safari has no
          // Vibration API, so the scale-punch shake carries the feel there.
          // A short double-tick on the special "impact" catch reads firmer
          // than a single buzz; normal catches firm up gently with the combo.
          navigator.vibrate?.(entity.special ? [14, 22, 22] : Math.round(10 + feel.intensity * 12));
          score += entity.points;
          onScoreChangeRef.current(score);
          // Combo ladder: each consecutive catch plays the tone one step up a
          // major scale. Pure feel — points are unchanged.
          playSound(entity.special ? "specialCatch" : "catch", { rate: feel.pitchRate });
          const catchX = entity.x;
          const catchPoints = entity.points;
          const catchSpecial = entity.special;
          const catchComboT = feel.intensity;
          window.setTimeout(
            () => spawnCatchBurst(catchX, basketCenterY - 10, catchSpecial, catchComboT),
            CATCH_BURST_DELAY_MS,
          );
          window.setTimeout(
            () => spawnFloatingScore(catchX - 10, basketCenterY - 46, catchPoints, catchSpecial),
            FLOATING_SCORE_DELAY_MS,
          );
          fruitsCaughtInStage += 1;
          if (stage.targetFruits !== null && fruitsCaughtInStage >= stage.targetFruits) {
            completeStage();
            return;
          }
        } else if (entity.y - FRUIT_RADIUS > rect.height) {
          entity.state = "missed";
          entity.inner.classList.add("fruit__emoji--missed");
          window.setTimeout(() => entity.el.remove(), 220);
          hearts -= 1;
          onHeartsChangeRef.current(hearts);
          // Combo cools down: pitch returns to the root note next catch and the
          // aura fades out. Gentle, not a punishment on top of the lost heart.
          streak = 0;
          basket.style.setProperty("--combo-glow", "0");
          playSound("miss");
          triggerMissFeedback();
          if (hearts <= 0) {
            endGame();
            return;
          }
        }
      }

      for (let i = entities.length - 1; i >= 0; i -= 1) {
        if (entities[i].state !== "falling") entities.splice(i, 1);
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      gameOver = true;
      cancelAnimationFrame(rafId);
      field.removeEventListener("pointerdown", handlePointerDown);
      field.removeEventListener("pointermove", handlePointerMove);
      field.removeEventListener("pointerup", handlePointerUp);
      field.removeEventListener("pointercancel", handlePointerUp);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      entities.forEach((entity) => entity.el.remove());
      field.querySelectorAll(".float-score, .catch-burst").forEach((el) => el.remove());
    };
  }, [fieldRef, basketRef, basketEmojiRef, heartsWrapRef, startElapsedMs, startScore, startHearts, stage]);
}
