export type SoundName = "catch" | "miss" | "gameOver";

const clips: Partial<Record<SoundName, HTMLAudioElement>> = {};

export function playSound(name: SoundName): void {
  clips[name]?.play().catch(() => {});
}
