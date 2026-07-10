const LOGO_ASPECT_RATIO = 759 / 305.25;

interface BrandLogoProps {
  width: number;
  className?: string;
}

export function BrandLogo({ width, className }: BrandLogoProps) {
  const height = Math.round(width / LOGO_ASPECT_RATIO);
  return (
    <img
      className={className ? `brand-logo ${className}` : "brand-logo"}
      src="/brand/logo-full-color.svg"
      alt="قشطة"
      width={width}
      height={height}
      decoding="async"
      style={{ width, height }}
    />
  );
}
