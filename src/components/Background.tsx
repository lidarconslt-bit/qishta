import { ACTIVE_BACKGROUND, BACKGROUNDS, type BackgroundVariant } from "../backgrounds/registry";

interface BackgroundProps {
  /** Which scene to show. Defaults to the registry's active background. */
  variant?: BackgroundVariant;
}

// Renders the active background scene as a single lightweight, non-interactive
// layer behind everything else. The SVG is loaded via <img>, so its internal
// CSS keyframes (the gentle parallax drift) run on the GPU while gameplay code
// stays completely unaware of which theme is active.
export function Background({ variant = ACTIVE_BACKGROUND }: BackgroundProps) {
  const scene = BACKGROUNDS[variant];
  return (
    <div className="background" aria-hidden="true">
      <img className="background__scene" src={scene.src} alt="" draggable={false} />
    </div>
  );
}
