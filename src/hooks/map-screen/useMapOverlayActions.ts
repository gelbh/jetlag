import { useCallback } from "react";
import type { MapSheetOverlay } from "../../hooks/map/useMapOverlayState";
import type { MapTool } from "../../state/sessionStore";

interface UseMapOverlayActionsOptions {
  overlay: {
    openChat: () => void;
    openSettings: () => void;
    openLog: () => void;
    openCodes: () => void;
    openSheet: (sheet: MapSheetOverlay) => void;
  };
  resetToolDrafts: () => void;
  setActiveTool: (tool: MapTool) => void;
  setAwaitingPlacement: (awaiting: boolean) => void;
  setSelectedAnnotationId: (id: string | null) => void;
  cancelGeometryEdit: () => void;
}

export function useMapOverlayActions({
  overlay,
  resetToolDrafts,
  setActiveTool,
  setAwaitingPlacement,
  setSelectedAnnotationId,
  cancelGeometryEdit,
}: UseMapOverlayActionsOptions) {
  const openOverlay = useCallback(
    (sheet: MapSheetOverlay) => {
      resetToolDrafts();
      setActiveTool("none");
      setAwaitingPlacement(false);
      setSelectedAnnotationId(null);
      cancelGeometryEdit();
      overlay.openSheet(sheet);
    },
    [
      cancelGeometryEdit,
      overlay,
      resetToolDrafts,
      setActiveTool,
      setAwaitingPlacement,
      setSelectedAnnotationId,
    ],
  );

  const handleOpenChat = () => openOverlay("chat");
  const handleOpenSettings = () => openOverlay("settings");
  const handleOpenLog = () => openOverlay("log");
  const handleOpenCodes = () => openOverlay("codes");

  return {
    openOverlay,
    handleOpenChat,
    handleOpenSettings,
    handleOpenLog,
    handleOpenCodes,
  };
}
