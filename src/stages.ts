// Stage configuration. Every stage-tunable value the game loop reads lives
// here, in one place, so a new stage is just a new entry in STAGES rather
// than a code change spread across the game loop.
//
// Only stage 1 is wired up to anything today. targetFruits/hazards/custom
// exist as part of the shape so future stages can use them, but nothing in
// the game currently reads or acts on them — there is no completion check,
// no transition, and no hazard system yet.

export interface SpecialFruit {
  id: string;
  emoji: string;
  points: number;
  className: string;
  minIntervalMs: number;
  maxIntervalMs: number;
  // Optional shorter window for this fruit's very first appearance in a
  // session, so it isn't left to the luck of the regular rare timing.
  // Falls back to minIntervalMs/maxIntervalMs when omitted.
  firstMinIntervalMs?: number;
  firstMaxIntervalMs?: number;
}

// Placeholder shape for a future hazard system (obstacles, timed penalties,
// etc). No hazard logic exists yet — this only reserves where that
// configuration will live once it does.
export interface HazardConfig {
  id: string;
}

export interface StageConfig {
  id: number;
  // Number of fruit catches that complete the stage, or null for an endless
  // stage (current behavior). Not read by any game logic yet.
  targetFruits: number | null;
  // Scales how quickly the difficulty ramp progresses over time. 1 reproduces
  // today's pacing exactly.
  difficultyMultiplier: number;
  specialFruits: SpecialFruit[];
  hazards: HazardConfig[];
  // Open-ended bag for future per-stage behavior that doesn't fit the fields
  // above (e.g. custom spawn rules, environment tweaks). Unused today.
  custom?: Record<string, unknown>;
}

const DATE_FRUIT: SpecialFruit = {
  id: "date",
  emoji: "🌴",
  points: 5,
  className: "fruit__emoji--date",
  minIntervalMs: 20000,
  maxIntervalMs: 30000,
  firstMinIntervalMs: 10000,
  firstMaxIntervalMs: 15000,
};

export const STAGES: StageConfig[] = [
  {
    id: 1,
    targetFruits: null,
    difficultyMultiplier: 1,
    specialFruits: [DATE_FRUIT],
    hazards: [],
  },
];

const ACTIVE_STAGE_INDEX = 0;

export function getActiveStage(): StageConfig {
  return STAGES[ACTIVE_STAGE_INDEX];
}
