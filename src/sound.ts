import { AudioManager } from "./audio";

export type SoundName = "catch" | "specialCatch" | "miss" | "gameOver";

// Only the normal-fruit catch sound is registered so far. specialCatch,
// miss, and gameOver stay unregistered - AudioManager.play() on those
// remains a silent no-op via its graceful fallback, exactly as before.
AudioManager.register("catch", "/sounds/catch.wav");
void AudioManager.preload(["catch"]);

export function playSound(name: SoundName, options?: { rate?: number }): void {
  AudioManager.play(name, options);
}
