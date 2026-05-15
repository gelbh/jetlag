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
        <p className="text-xs uppercase tracking-wide text-slate-400">
          {mapToolPlacingLabel(toolId)}
        </p>
        {prompt ? (
          typeof prompt === "string" ? (
            <p className="text-sm font-medium text-slate-100">{prompt}</p>
          ) : (
            prompt
          )
        ) : null}
        {helper ? (
          typeof helper === "string" ? (
            <p className="text-sm text-slate-300">{helper}</p>
          ) : (
            helper
          )
        ) : null}
      </div>
      {children}
    </div>
  );
}
