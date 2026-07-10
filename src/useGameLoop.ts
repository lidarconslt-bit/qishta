import { useEffect, useRef, type RefObject } from "react";
import { playSound } from "./sound";

const FRUIT_EMOJIS = ["🍎", "🍌", "🍇", "🍉", "🍒", "🍑", "🍓", "🥝", "🍍", "🍊"];

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
const CATCH_BURST_DELAY_MS = 40;
const FLOATING_SCORE_DELAY_MS = 70;

function smoothstep(x: number): number {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}

interface FruitEntity {
  el: HTMLDivElement;
  inner: HTMLDivElement;
  x: number;
  y: number;
  vy: number;
  state: "falling" | "caught" | "missed";
}

interface UseGameLoopOptions {
  fieldRef: RefObject<HTMLDivElement | null>;
  basketRef: RefObject<HTMLDivElement | null>;
  basketEmojiRef: RefObject<HTMLDivElement | null>;
  heartsWrapRef: RefObject<HTMLDivElement | null>;
  startElapsedMs: number;
  onScoreChange: (score: number) => void;
  onHeartsChange: (hearts: number) => void;
  onGameOver: (finalScore: number, elapsedMs: number) => void;
}

export function useGameLoop({
  fieldRef,
  basketRef,
  basketEmojiRef,
  heartsWrapRef,
  startElapsedMs,
  onScoreChange,
  onHeartsChange,
  onGameOver,
}: UseGameLoopOptions): void {
  const onScoreChangeRef = useRef(onScoreChange);
  const onHeartsChangeRef = useRef(onHeartsChange);
  const onGameOverRef = useRef(onGameOver);
  onScoreChangeRef.current = onScoreChange;
  onHeartsChangeRef.current = onHeartsChange;
  onGameOverRef.current = onGameOver;

  useEffect(() => {
    const field = fieldRef.current;
    const basket = basketRef.current;
    if (!field || !basket) return;

    let rafId = 0;
    let lastTime = 0;
    let elapsedMs = startElapsedMs;
    let spawnTimerMs = START_DELAY_MS;
    let score = 0;
    let hearts = 3;
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

    const difficultyProgress = () => smoothstep(elapsedMs / 1000 / RAMP_DURATION_SEC);

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
      let index = Math.floor(Math.random() * FRUIT_EMOJIS.length);
      if (index === lastEmojiIndex) {
        index = (index + 1 + Math.floor(Math.random() * (FRUIT_EMOJIS.length - 1))) % FRUIT_EMOJIS.length;
      }
      lastEmojiIndex = index;
      return FRUIT_EMOJIS[index];
    };

    const spawnFruit = (fieldWidth: number) => {
      const el = document.createElement("div");
      el.className = "fruit";
      const inner = document.createElement("div");
      inner.className = "fruit__emoji";
      inner.textContent = pickFruitEmoji();
      el.appendChild(inner);
      field.appendChild(el);
      const x = pickSpawnX(fieldWidth);
      const vy = currentFallSpeed() * (0.88 + Math.random() * 0.24);
      entities.push({ el, inner, x, y: -FRUIT_RADIUS, vy, state: "falling" });
    };

    const spawnFloatingScore = (x: number, y: number) => {
      const wrapper = document.createElement("div");
      wrapper.className = "float-score";
      wrapper.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      const inner = document.createElement("div");
      inner.className = "float-score__inner";
      inner.textContent = "+1";
      wrapper.appendChild(inner);
      field.appendChild(wrapper);
      window.setTimeout(() => wrapper.remove(), 700);
    };

    const spawnCatchBurst = (x: number, y: number) => {
      const wrapper = document.createElement("div");
      wrapper.className = "catch-burst";
      wrapper.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      const ring = document.createElement("div");
      ring.className = "catch-burst__ring";
      wrapper.appendChild(ring);
      for (let i = 0; i < PARTICLE_COUNT; i += 1) {
        const angle = (Math.PI * 2 * i) / PARTICLE_COUNT + (Math.random() - 0.5) * 0.5;
        const distance = 20 + Math.random() * 16;
        const isSparkle = i % 3 === 2;
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

      spawnTimerMs -= dt * 1000;
      if (spawnTimerMs <= 0) {
        spawnFruit(rect.width);
        spawnTimerMs = currentSpawnInterval() * (0.85 + Math.random() * 0.3);
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
          entity.inner.style.setProperty("--pop-rotate", `${(Math.random() - 0.5) * 28}deg`);
          entity.inner.classList.add("fruit__emoji--caught");
          window.setTimeout(() => entity.el.remove(), 280);
          pulseBasket("basket__emoji--catch");
          navigator.vibrate?.(10);
          score += 1;
          onScoreChangeRef.current(score);
          playSound("catch");
          const catchX = entity.x;
          window.setTimeout(() => spawnCatchBurst(catchX, basketCenterY - 10), CATCH_BURST_DELAY_MS);
          window.setTimeout(
            () => spawnFloatingScore(catchX - 10, basketCenterY - 46),
            FLOATING_SCORE_DELAY_MS,
          );
        } else if (entity.y - FRUIT_RADIUS > rect.height) {
          entity.state = "missed";
          entity.inner.classList.add("fruit__emoji--missed");
          window.setTimeout(() => entity.el.remove(), 220);
          hearts -= 1;
          onHeartsChangeRef.current(hearts);
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
  }, [fieldRef, basketRef, basketEmojiRef, heartsWrapRef, startElapsedMs]);
}
