import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import type { RefObject } from "react";
import {
  isActive,
  LOCAL_SESSION_ID,
  type SessionRecord,
} from "../../domain/annotations";
import type { AnnotationRecord } from "../../domain/annotations";
import { endRemoteSession } from "../../services/firestoreAnnotations";
import { useSessionStore } from "../../state/sessionStore";

interface UseMapSessionChromeParams {
  session: SessionRecord | null;
  isHost: boolean;
  annotations: AnnotationRecord[];
  mapShellRef: RefObject<HTMLDivElement | null>;
  exportLegendRef: RefObject<HTMLDivElement | null>;
  clearAllAnnotations: () => Promise<void>;
  setSelectedAnnotationId: (id: string | null) => void;
  setSettingsOpen: (open: boolean) => void;
}

export function useMapSessionChrome({
  session,
  isHost,
  annotations,
  mapShellRef,
  exportLegendRef,
  clearAllAnnotations,
  setSelectedAnnotationId,
  setSettingsOpen,
}: UseMapSessionChromeParams) {
  const navigate = useNavigate();
  const setSession = useSessionStore((state) => state.setSession);

  const handleClearMap = useCallback(() => {
    const activeCount = annotations.filter(isActive).length;
    if (activeCount === 0) {
      return;
    }

    if (
      !window.confirm(
        `Remove all ${activeCount} annotation${activeCount === 1 ? "" : "s"} from the map?`,
      )
    ) {
      return;
    }

    setSelectedAnnotationId(null);
    setSettingsOpen(false);
    void clearAllAnnotations();
  }, [
    annotations,
    clearAllAnnotations,
    setSelectedAnnotationId,
    setSettingsOpen,
  ]);

  const handleResetBoard = useCallback(() => {
    if (!isHost) {
      return;
    }

    const activeCount = annotations.filter(isActive).length;
    if (activeCount === 0) {
      return;
    }

    if (
      !window.confirm(
        "Remove all annotations for every player on this session?",
      )
    ) {
      return;
    }

    setSelectedAnnotationId(null);
    setSettingsOpen(false);
    void clearAllAnnotations();
  }, [
    annotations,
    clearAllAnnotations,
    isHost,
    setSelectedAnnotationId,
    setSettingsOpen,
  ]);

  const handleEndSession = useCallback(async () => {
    if (!session || !isHost || session.id === LOCAL_SESSION_ID) {
      return;
    }

    if (!window.confirm("End this session for all players?")) {
      return;
    }

    await endRemoteSession(session.id);
    setSession(null);
    setSettingsOpen(false);
    navigate("/");
  }, [isHost, navigate, session, setSession, setSettingsOpen]);

  const exportMap = useCallback(async () => {
    if (!session || !mapShellRef.current) {
      return;
    }

    if (exportLegendRef.current) {
      exportLegendRef.current.style.display = "block";
    }

    const canvas = await html2canvas(mapShellRef.current, {
      useCORS: true,
      backgroundColor: "#0f172a",
    });

    if (exportLegendRef.current) {
      exportLegendRef.current.style.display = "none";
    }

    const link = document.createElement("a");
    link.download = `jetlag-map-${session.code}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, [exportLegendRef, mapShellRef, session]);

  return {
    handleClearMap,
    handleResetBoard,
    handleEndSession,
    exportMap,
  };
}
