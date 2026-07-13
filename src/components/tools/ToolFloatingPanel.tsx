import { useRef } from "react";
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
  userMinimized: boolean;
  onMinimizedChange: (minimized: boolean) => void;
  onClose: () => void;
  children: React.ReactNode;
}

export function ToolFloatingPanel({
  toolId,
  mapPanning,
  userMinimized,
  onMinimizedChange,
  onClose,
  children,
}: ToolFloatingPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { panelStyle, handleProps, peekHandleProps, displayMinimized, isDragging } =
    usePanelDrag({
      userMinimized,
      mapPanning,
      onMinimizedChange,
      panelRef,
    });

  const isWizardTool = isQuestionDockTool(toolId);

  return (
    <MapFloatingPanel
      displayMinimized={displayMinimized}
      onMinimizedChange={onMinimizedChange}
      mapPanning={mapPanning}
      isDragging={isDragging}
      title={mapToolPlacingLabel(toolId)}
      peekLabel={mapToolPlacingLabel(toolId)}
      onClose={onClose}
      closeLabel={`Close ${mapToolPlacingLabel(toolId)}`}
      maxHeightClassName={
        isWizardTool ? "jl-wizard-panel-max-h" : "max-h-[min(34dvh,320px)]"
      }
      bodyScrollable={!isWizardTool}
      panelLayout={isWizardTool ? "wizard" : "default"}
      outerRef={panelRef}
      panelStyle={panelStyle}
      dragHandleProps={handleProps}
      peekHandleProps={peekHandleProps}
      contentKey={toolId}
    >
      {children}
    </MapFloatingPanel>
  );
}
