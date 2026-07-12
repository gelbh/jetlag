import { useAdaptivePanelDrag } from "../../hooks/useAdaptivePanelDrag";
import {
  isWizardDockTool,
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
  const { panelStyle, handleProps, useFramerDrag } = useAdaptivePanelDrag({
    minimized,
    onMinimizedChange,
  });

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
        isWizardDockTool(toolId)
          ? "max-h-[min(54dvh,480px)]"
          : "max-h-[min(34dvh,320px)]"
      }
      panelStyle={useFramerDrag ? undefined : panelStyle}
      dragHandleProps={handleProps}
      contentKey={toolId}
    >
      {children}
    </MapFloatingPanel>
  );
}
