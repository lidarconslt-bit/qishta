interface IconProps {
  size?: number;
}

const strokeProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function ReplayIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path {...strokeProps} d="M4 12a8 8 0 1 1 2.6 5.9" />
      <path {...strokeProps} d="M4 17v-5h5" />
    </svg>
  );
}

export function ShareIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle {...strokeProps} cx="18" cy="5" r="2.6" />
      <circle {...strokeProps} cx="6" cy="12" r="2.6" />
      <circle {...strokeProps} cx="18" cy="19" r="2.6" />
      <path {...strokeProps} d="M8.3 10.7 15.7 6.3" />
      <path {...strokeProps} d="M8.3 13.3 15.7 17.7" />
    </svg>
  );
}
