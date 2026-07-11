import { usePanelDrag } from "../../hooks/usePanelDrag";
import {
  isWizardDockTool,
  mapToolPlacingLabel,
  type DockableMapTool,
} from "../../domain/map/mapTools";
import { MapFloatingPanel } from "../ui/MapFloatingPanel";

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

  return (
    <MapFloatingPanel
      minimized={minimized}
      onMinimizedChange={onMinimizedChange}
      mapPanning={mapPanning}
      peekLabel={mapToolPlacingLabel(toolId)}
      onClose={onClose}
      closeLabel={`Close ${mapToolPlacingLabel(toolId)}`}
      maxHeightClassName={
        isWizardDockTool(toolId)
          ? "max-h-[min(54dvh,480px)]"
          : "max-h-[min(34dvh,320px)]"
      }
      panelStyle={panelStyle}
      dragHandleProps={handleProps}
      contentKey={toolId}
    >
      {children}
    </MapFloatingPanel>
  );
}
