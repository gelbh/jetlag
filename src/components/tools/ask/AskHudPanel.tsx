/**
 * Ask path frosted panel — style object from entryStyles (was `.ask-hud-panel`).
 * Plain div keeps unit tests that omit MantineProvider working.
 */
import type { CSSProperties, ReactNode } from "react";
import { askHudPanelStyle } from "@/components/ui/entry/entryStyles";
import { cn } from "@/lib/cn";

type AskHudPanelProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  role?: string;
  "data-testid"?: string;
};

export function AskHudPanel({
  children,
  className,
  style,
  role,
  "data-testid": testId,
}: AskHudPanelProps) {
  return (
    <div
      className={cn("pointer-events-auto", className)}
      role={role}
      data-testid={testId}
      style={{ ...askHudPanelStyle, ...style }}
    >
      {children}
    </div>
  );
}
