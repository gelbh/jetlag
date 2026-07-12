import { useCallback } from "react";
import { useAppNavigate } from "../../hooks/useAppNavigate";
import type { RefObject } from "react";
import {
  isActive,
  LOCAL_SESSION_ID,
  type SessionRecord,
} from "../../domain/map/annotations";
import type { AnnotationRecord } from "../../domain/map/annotations";
import { endRemoteSession } from "../../services/firestore/firestoreAnnotations";
import { clearSessionLocalArtifacts } from "../../services/session/sessionCleanup";
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
  endGameBlocked?: boolean;
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
  endGameBlocked = false,
}: UseMapSessionChromeParams) {
  const navigate = useAppNavigate();
  const setSession = useSessionStore((state) => state.setSession);

  const handleClearMap = useCallback(() => {
    if (endGameBlocked) {
      return;
    }

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
    endGameBlocked,
    setSelectedAnnotationId,
  ]);

  const handleResetBoard = useCallback(() => {
    if (endGameBlocked) {
      return;
    }

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
    endGameBlocked,
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
    closeSettingsPanel();
    navigate("/", { replace: true });
    await clearSessionLocalArtifacts(sessionId);
    setSession(null);
  }, [isHost, navigate, session, setSession, closeSettingsPanel]);

  const handleLeaveSession = useCallback(async () => {
    if (!session) {
      return;
    }

    if (
      !window.confirm(
        "Leave this session on this device? Other players can keep playing.",
      )
    ) {
      return;
    }

    const sessionId = session.id;
    closeSettingsPanel();
    navigate("/", { replace: true });
    await clearSessionLocalArtifacts(sessionId);
    setSession(null);
  }, [closeSettingsPanel, navigate, session, setSession]);

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
    handleLeaveSession,
    exportMap,
  };
}
