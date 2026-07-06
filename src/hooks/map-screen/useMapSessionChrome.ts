import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { RefObject } from "react";
import {
  isActive,
  LOCAL_SESSION_ID,
  type SessionRecord,
} from "../../domain/annotations";
import type { AnnotationRecord } from "../../domain/annotations";
import { endRemoteSession } from "../../services/firestoreAnnotations";
import { clearSessionLocalArtifacts } from "../../services/sessionCleanup";
import { useSessionStore } from "../../state/sessionStore";

interface UseMapSessionChromeParams {
  session: SessionRecord | null;
  isHost: boolean;
  annotations: AnnotationRecord[];
  mapShellRef: RefObject<HTMLDivElement | null>;
  exportLegendRef: RefObject<HTMLDivElement | null>;
  clearAllAnnotations: () => Promise<void>;
  setSelectedAnnotationId: (id: string | null) => void;
  closeSettingsPanel: () => void;
}

export function useMapSessionChrome({
  session,
  isHost,
  annotations,
  mapShellRef,
  exportLegendRef,
  clearAllAnnotations,
  setSelectedAnnotationId,
  closeSettingsPanel,
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
    closeSettingsPanel();
    void clearAllAnnotations();
  }, [
    annotations,
    clearAllAnnotations,
    closeSettingsPanel,
    setSelectedAnnotationId,
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
    closeSettingsPanel();
    void clearAllAnnotations();
  }, [
    annotations,
    clearAllAnnotations,
    isHost,
    setSelectedAnnotationId,
    closeSettingsPanel,
  ]);

  const handleEndSession = useCallback(async () => {
    if (!session || !isHost || session.id === LOCAL_SESSION_ID) {
      return;
    }

    if (!window.confirm("End this session for all players?")) {
      return;
    }

    const sessionId = session.id;
    await endRemoteSession(sessionId);
    await clearSessionLocalArtifacts(sessionId);
    setSession(null);
    closeSettingsPanel();
    navigate("/");
  }, [isHost, navigate, session, setSession, closeSettingsPanel]);

  const exportMap = useCallback(async () => {
    if (!session || !mapShellRef.current) {
      return;
    }

    if (exportLegendRef.current) {
      exportLegendRef.current.style.display = "block";
    }

    const { default: html2canvas } = await import("html2canvas");
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
