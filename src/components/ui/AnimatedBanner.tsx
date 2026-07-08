import type { ReactNode } from "react";
import { useAnimatedPresence } from "../../hooks/useAnimatedPresence";

interface AnimatedBannerProps {
  visible: boolean;
  onDismiss?: () => void;
  children: ReactNode;
  className?: string;
}

export function AnimatedBanner({
  visible,
  onDismiss,
  children,
  className = "",
}: AnimatedBannerProps) {
  const { mounted, animClass, setAnimNode } = useAnimatedPresence({
    open: visible,
    onClose: onDismiss ?? (() => {}),
    enterClass: "jl-banner-enter",
    exitClass: "jl-banner-exit",
    durationMs: 200,
  });

  if (!mounted) {
    return null;
  }

  return (
    <div
      ref={setAnimNode}
      className={`${animClass} ${className}`.trim()}
    >
      {children}
    </div>
  );
}
