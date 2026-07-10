import { BrandLogo } from "./BrandLogo";

interface SplashProps {
  hiding: boolean;
}

export function Splash({ hiding }: SplashProps) {
  return (
    <div className={hiding ? "splash splash--hiding" : "splash"}>
      <div className="splash__glow" aria-hidden="true" />
      <BrandLogo width={220} className="splash__logo" />
    </div>
  );
}
