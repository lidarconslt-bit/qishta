// Combo is a Game Feel system only. A run of consecutive catches makes the
// feedback escalate — sound pitch climbs a musical scale, the catch burst
// grows, haptics firm up, and a soft aura builds behind the basket. It never
// touches scoring, currency, or any in-game economy: catching fruit is still
// worth exactly what it was worth, the streak only changes how a catch *feels*.
//
// A single streak count drives one shared intensity, so every channel rises
// together and resets together. All the tuning lives here.

// Ascending major scale in semitones (do re mi fa sol la ti do). Each
// consecutive catch steps one note up; past the top note the ladder holds at
// the octave so long runs stay bright without turning shrill.
const COMBO_SCALE_SEMITONES = [0, 2, 4, 5, 7, 9, 11, 12];

// The basket aura stays hidden until the player has a real streak going, so
// ordinary early catches keep the screen calm.
const GLOW_START_STREAK = 3;

export interface ComboFeel {
  /** Position on the ladder, 0..maxStep. */
  step: number;
  /** Shared 0..1 intensity driving burst size, particle count, and haptics. */
  intensity: number;
  /** playbackRate for the catch tone — the rising musical ladder. */
  pitchRate: number;
  /** 0..1 opacity for the basket aura; 0 below the streak threshold. */
  glow: number;
}

/**
 * Maps a live streak (number of consecutive catches, 1 on the first catch) to
 * the feel values for that catch. Safe for streak <= 0 (returns the resting
 * root note with no glow).
 */
export function comboFeel(streak: number): ComboFeel {
  const maxStep = COMBO_SCALE_SEMITONES.length - 1;
  const step = Math.max(0, Math.min(streak - 1, maxStep));
  const intensity = step / maxStep;
  const pitchRate = Math.pow(2, COMBO_SCALE_SEMITONES[step] / 12);
  const glow = streak >= GLOW_START_STREAK ? intensity : 0;
  return { step, intensity, pitchRate, glow };
}
