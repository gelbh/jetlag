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
}

export function ToolPanelShell({
  toolId,
  prompt,
  ruleSummary,
  helper,
  stepper,
  children,
}: ToolPanelShellProps) {
  const showHeader = !stepper && (prompt || helper);

  return (
    <div className="space-y-2.5">
      {showHeader ? (
        <div className="space-y-1 border-b-2 border-border pb-2">
          {!prompt ? (
            <p className="font-display text-xs font-semibold uppercase tracking-[0.12em] text-highlight">
              {mapToolPlacingLabel(toolId)}
            </p>
          ) : null}
          {prompt ? (
            typeof prompt === "string" ? (
              <div className="space-y-0.5">
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
