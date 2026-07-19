import { useCallback, useRef } from "react";
import type { RefObject } from "react";
import {
  isActive,
  LOCAL_SESSION_ID,
  type SessionRecord,
} from "../../domain/map/annotations";
import type { AnnotationRecord } from "../../domain/map/annotations";
import {
  listWalkingThermometerQuestionIds,
} from "../../domain/questions";
import type { PendingQuestionRecord } from "../../domain/session/sessionChat";
import {
  endRemoteSession,
  resetRemoteSession,
} from "../../services/firestore/firestoreAnnotations";
import {
  cancelWalkingThermometerQuestions,
  postGameSystemMessage,
} from "../../services/firestore/firestoreSessionExtras";
import { createMessageId } from "../../domain/session/sessionChat";
import {
  clearSessionLocalArtifacts,
  teardownSessionUiState,
} from "../../services/session/sessionCleanup";
import { useSessionExit } from "../session/useSessionExit";
import { ensureAnonymousUser } from "../../services/core/firebase";
import { captureException } from "../../services/core/sentry";
import { forceRgbCssColorsInClone } from "../../services/core/html2canvasColors";
import { isHtml2CanvasUnsupportedColorMessage } from "../../services/core/html2canvasErrors";
import { useSessionStore } from "../../state/sessionStore";

const MAP_EXPORT_BACKGROUND = "#0f172a";

interface UseMapSessionChromeParams {
  session: SessionRecord | null;
  isHost: boolean;
  annotations: AnnotationRecord[];
  pendingQuestions?: readonly PendingQuestionRecord[];
  mapShellRef: RefObject<HTMLDivElement | null>;
  exportLegendRef: RefObject<HTMLDivElement | null>;
  clearAllAnnotations: () => Promise<void>;
  setSelectedAnnotationId: (id: string | null) => void;
  closeSettingsPanel: () => void;
  resetTimer: () => void;
  endGameBlocked?: boolean;
}

export function useMapSessionChrome({
  session,
  isHost,
  annotations,
  pendingQuestions = [],
  mapShellRef,
  exportLegendRef,
  clearAllAnnotations,
  setSelectedAnnotationId,
  closeSettingsPanel,
  resetTimer,
  endGameBlocked = false,
}: UseMapSessionChromeParams) {
  const exitSession = useSessionExit();
  const setSession = useSessionStore((state) => state.setSession);
  const resetInFlightRef = useRef(false);

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

  const handleResetSession = useCallback(async () => {
    if (
      !session ||
      !isHost ||
      session.id === LOCAL_SESSION_ID ||
      resetInFlightRef.current
    ) {
      return;
    }

    if (
      !window.confirm(
        "Reset all session progress? Keeps the same code and players. Clears timer, map, questions, chat, zones, traps, and end-game state.",
      )
    ) {
      return;
    }

    resetInFlightRef.current = true;
    const sessionId = session.id;

    try {
      const user = await ensureAnonymousUser();
      const hostRole = session.memberRoles?.[user.uid];
      if (!hostRole) {
        window.alert("Could not reset session: your role in this session is unknown.");
        return;
      }

      const resetAt = await resetRemoteSession(sessionId, user.uid, hostRole);

      setSession({
        ...session,
        sessionResetAt: resetAt,
        timerAccumulatedMs: 0,
        timerRunningSince: null,
        endGameStartedAt: undefined,
        endGameStartedByUid: undefined,
        endGameRequestedAt: undefined,
        endGameRequestedByUid: undefined,
      });
      resetTimer();
      teardownSessionUiState();
      setSelectedAnnotationId(null);
      await clearAllAnnotations();
      await clearSessionLocalArtifacts(sessionId);
      closeSettingsPanel();
    } catch {
      window.alert("Could not reset session. Check your connection and try again.");
    } finally {
      resetInFlightRef.current = false;
    }
  }, [
    clearAllAnnotations,
    closeSettingsPanel,
    isHost,
    resetTimer,
    session,
    setSelectedAnnotationId,
    setSession,
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
    await exitSession({
      reason: "end",
      sessionId,
      replace: true,
      closeOverlays: closeSettingsPanel,
    });
  }, [closeSettingsPanel, exitSession, isHost, session]);

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

    if (session.id !== LOCAL_SESSION_ID) {
      try {
        const user = await ensureAnonymousUser();
        const walkIds = listWalkingThermometerQuestionIds(
          pendingQuestions,
          user.uid,
        );
        if (walkIds.length > 0) {
          await cancelWalkingThermometerQuestions(session.id, walkIds);
          const role = session.memberRoles?.[user.uid] ?? "seeker";
          for (const _walkId of walkIds) {
            await postGameSystemMessage(
              session.id,
              user.uid,
              role,
              "Thermometer walk cancelled — seeker left.",
              createMessageId(),
            );
          }
        }
      } catch (error) {
        captureException(error);
      }
    }

    await exitSession({
      reason: "leave",
      sessionId: session.id,
      replace: true,
      closeOverlays: closeSettingsPanel,
    });
  }, [closeSettingsPanel, exitSession, pendingQuestions, session]);

  const exportMap = useCallback(async () => {
    if (!session || !mapShellRef.current) {
      return;
    }

    if (exportLegendRef.current) {
      exportLegendRef.current.style.display = "block";
    }

    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(mapShellRef.current, {
        useCORS: true,
        backgroundColor: MAP_EXPORT_BACKGROUND,
        onclone: (_clonedDocument, element) => {
          forceRgbCssColorsInClone(element);
        },
      });

      const link = document.createElement("a");
      link.download = `jetlag-map-${session.code}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (isHtml2CanvasUnsupportedColorMessage(message)) {
        window.alert(
          "Could not export the map. Try again, or take a screenshot instead.",
        );
        return;
      }
      captureException(error);
      window.alert(
        "Could not export the map. Try again, or take a screenshot instead.",
      );
    } finally {
      if (exportLegendRef.current) {
        exportLegendRef.current.style.display = "none";
      }
    }
  }, [exportLegendRef, mapShellRef, session]);

  return {
    handleClearMap,
    handleResetBoard,
    handleResetSession,
    handleEndSession,
    handleLeaveSession,
    exportMap,
  };
}
