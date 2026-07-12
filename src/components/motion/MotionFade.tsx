import type { ReactNode } from "react";
import { useMotionProfile } from "../../hooks/useMotionProfile";

interface MotionFadeProps {
  children: ReactNode;
  className?: string;
}

/** CSS fade-in wrapper that respects the motion profile. */
export function MotionFade({ children, className = "" }: MotionFadeProps) {
  const { animate } = useMotionProfile();

  if (!animate) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={`jl-banner-enter ${className}`.trim()}>{children}</div>
  );
}
