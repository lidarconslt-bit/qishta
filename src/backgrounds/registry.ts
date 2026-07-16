// Background System
// ------------------
// A tiny registry that decouples the *active* game background from gameplay.
// Each variant is a self-contained SVG scene in public/backgrounds/ (cream sky,
// layered hills, soft clouds, gentle internal parallax). Adding a new theme is
// just dropping an SVG in that folder and adding an entry here — no gameplay or
// loop code changes. Switching the active background for a game is a one-line
// change to ACTIVE_BACKGROUND (or passing a different variant to <Background>).

export type BackgroundVariant = "default" | "fruit" | "ramadan" | "space";

export interface BackgroundDef {
  /** Public URL of the scene SVG (served statically from /public). */
  src: string;
  /** Human-friendly label, handy for a future theme picker. */
  label: string;
}

export const BACKGROUNDS: Record<BackgroundVariant, BackgroundDef> = {
  default: { src: "/backgrounds/background_default.svg", label: "Default" },
  fruit: { src: "/backgrounds/background_fruit.svg", label: "Fruit Orchard" },
  ramadan: { src: "/backgrounds/background_ramadan.svg", label: "Ramadan" },
  space: { src: "/backgrounds/background_space.svg", label: "Space" },
};

// The background the game currently ships with. Change this one value (or the
// prop passed to <Background>) to switch themes — gameplay stays untouched.
export const ACTIVE_BACKGROUND: BackgroundVariant = "fruit";
