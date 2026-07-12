import { usePanelDrag } from "../../hooks/usePanelDrag";
import {
  isQuestionDockTool,
  mapToolPlacingLabel,
  type DockableMapTool,
} from "../../domain/map/mapTools";
import { MapFloatingPanel } from "../map/MapFloatingPanel";

interface ToolFloatingPanelProps {
  toolId: DockableMapTool;
  mapPanning: boolean;
  minimized: boolean;
  onMinimizedChange: (minimized: boolean) => void;
  onClose: () => void;
  children: React.ReactNode;
}

export function ToolFloatingPanel({
  toolId,
  mapPanning,
  minimized,
  onMinimizedChange,
  onClose,
  children,
}: ToolFloatingPanelProps) {
  const { panelStyle, handleProps } = usePanelDrag({
    minimized,
    onMinimizedChange,
  });

  const isWizardTool = isQuestionDockTool(toolId);

  return (
    <MapFloatingPanel
      minimized={minimized}
      onMinimizedChange={onMinimizedChange}
      mapPanning={mapPanning}
      title={mapToolPlacingLabel(toolId)}
      peekLabel={mapToolPlacingLabel(toolId)}
      onClose={onClose}
      closeLabel={`Close ${mapToolPlacingLabel(toolId)}`}
      maxHeightClassName={
        isWizardTool ? "jl-wizard-panel-max-h" : "max-h-[min(34dvh,320px)]"
      }
      bodyScrollable={!isWizardTool}
      panelLayout={isWizardTool ? "wizard" : "default"}
      panelStyle={panelStyle}
      dragHandleProps={handleProps}
      contentKey={toolId}
    >
      {children}
    </MapFloatingPanel>
  );
}
