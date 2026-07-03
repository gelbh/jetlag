import type { ReactNode } from "react";
import {
  mapToolPlacingLabel,
  type DockableMapTool,
} from "../../../domain/mapTools";

interface ToolPanelShellProps {
  toolId: DockableMapTool;
  prompt?: ReactNode;
  helper?: ReactNode;
  children?: ReactNode;
}

export function ToolPanelShell({
  toolId,
  prompt,
  helper,
  children,
}: ToolPanelShellProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs font-medium text-ink-dim">
          {mapToolPlacingLabel(toolId)}
        </p>
        {prompt ? (
          typeof prompt === "string" ? (
            <p className="text-sm font-medium text-ink">{prompt}</p>
          ) : (
            prompt
          )
        ) : null}
        {helper ? (
          typeof helper === "string" ? (
            <p className="text-sm text-ink-muted">{helper}</p>
          ) : (
            helper
          )
        ) : null}
      </div>
      {children}
    </div>
  );
}
