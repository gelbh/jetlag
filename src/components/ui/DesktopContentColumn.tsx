import type { ReactNode } from "react";
import { useDesktopLayout } from "../../hooks/useDesktopLayout";

export type DesktopContentMaxWidth = "entry" | "social";

export interface DesktopContentColumnProps {
  children: ReactNode;
  /** entry = 28rem; social = 36rem. Ignored under 1024. */
  maxWidth?: DesktopContentMaxWidth;
  className?: string;
}

const MAX_WIDTH_CLASS: Record<DesktopContentMaxWidth, string> = {
  entry: "max-w-[28rem]",
  social: "max-w-[36rem]",
};

export function DesktopContentColumn({
  children,
  maxWidth = "entry",
  className = "",
}: DesktopContentColumnProps) {
  const isDesktop = useDesktopLayout();
  if (!isDesktop) {
    if (!className) {
      return <>{children}</>;
    }
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      className={`mx-auto w-full ${MAX_WIDTH_CLASS[maxWidth]} ${className}`.trim()}
    >
      {children}
    </div>
  );
}
