import type { ReactNode } from "react";
import { AnimatedBanner } from "./AnimatedBanner";

interface HudBannerProps {
  visible: boolean;
  onDismiss?: () => void;
  className?: string;
  animated?: boolean;
  children: ReactNode;
}

export function HudBanner({
  visible,
  onDismiss,
  className = "",
  animated = true,
  children,
}: HudBannerProps) {
  if (!visible) {
    return null;
  }

  if (!animated) {
    return <div className={className.trim()}>{children}</div>;
  }

  return (
    <AnimatedBanner
      visible={visible}
      onDismiss={onDismiss}
      className={className}
    >
      {children}
    </AnimatedBanner>
  );
}
