import type { ReactNode } from "react";
import {
  mapToolPlacingLabel,
  type DockableMapTool,
} from "../../../domain/map/mapTools";

interface ToolPanelShellProps {
  toolId: DockableMapTool;
  prompt?: ReactNode;
  ruleSummary?: string;
  helper?: ReactNode;
  stepper?: ReactNode;
  children?: ReactNode;
  /** Live map wizards: fill the floating panel height for internal scroll. */
  fillHeight?: boolean;
}

export function ToolPanelShell({
  toolId,
  prompt,
  ruleSummary,
  helper,
  stepper,
  children,
  fillHeight = false,
}: ToolPanelShellProps) {
  const showHeader = !stepper && (prompt || helper);

  return (
    <div
      className={
        fillHeight
          ? "flex min-h-0 flex-1 flex-col gap-2.5"
          : "space-y-2.5"
      }
    >
      {showHeader ? (
        <div className="space-y-1 pb-2 text-center">
          {!prompt ? (
            <p className="font-display text-xs font-semibold uppercase tracking-[0.12em] text-highlight">
              {mapToolPlacingLabel(toolId)}
            </p>
          ) : null}
          {prompt ? (
            typeof prompt === "string" ? (
              <div className="space-y-0.5 text-center">
                <p className="text-sm font-medium leading-snug text-ink">
                  {prompt}
                </p>
                {ruleSummary ? (
                  <p className="text-xs leading-snug text-ink-dim">
                    {ruleSummary}
                  </p>
                ) : null}
              </div>
            ) : (
              prompt
            )
          ) : null}
          {helper ? (
            typeof helper === "string" ? (
              <p className="text-xs leading-snug text-ink-muted">{helper}</p>
            ) : (
              helper
            )
          ) : null}
        </div>
      ) : null}
      {stepper}
      {children}
    </div>
  );
}
