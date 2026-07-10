import type { ReactNode } from "react";

interface ButtonProps {
  variant: "primary" | "secondary";
  icon?: ReactNode;
  onClick: () => void;
  children: ReactNode;
}

export function Button({ variant, icon, onClick, children }: ButtonProps) {
  return (
    <button type="button" className={`btn btn--${variant}`} onClick={onClick}>
      {icon}
      <span>{children}</span>
    </button>
  );
}
