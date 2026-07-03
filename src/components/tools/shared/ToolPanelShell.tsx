import type { ReactNode } from "react";
import {
  mapToolPlacingLabel,
  type DockableMapTool,
} from "../../../domain/mapTools";

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
        <div className="space-y-1">
          {!prompt ? (
            <p className="text-xs font-medium text-ink-dim">
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
