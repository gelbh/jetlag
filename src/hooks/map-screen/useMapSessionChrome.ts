import type { RefObject } from "react";
import { useCallback, useRef } from "react";
import { callableErrorMessage } from "@/domain/device/feedback/userErrors";
import { isNeedsConnectionError } from "@/domain/device/network/needsConnectionError";
import { createLoadTask } from "@/services/core/progress/loadTask";
import { yieldToMain } from "@/services/core/progress/yieldToMain";
import { commitWrite } from "@/services/firestore/commitWrite";
import type { AnnotationRecord } from "../../domain/map/annotations";
import { isActive, LOCAL_SESSION_ID, type SessionRecord } from "../../domain/map/annotations";
import type { PendingQuestionRecord } from "../../domain/session/activity/sessionChat";
import { trackSessionEnded } from "../../services/core/analytics/analytics";
import { captureException } from "../../services/core/analytics/clientErrors";
import { forceRgbCssColorsInClone } from "../../services/core/capture/html2canvasColors";
import { isHtml2CanvasUnsupportedColorMessage } from "../../services/core/capture/html2canvasErrors";
import { ensureAnonymousUser } from "../../services/core/firebase/firebase";
import { withTimeout } from "../../services/core/withTimeout";
import {
  endRemoteSession,
  resetRemoteSession,
} from "../../services/firestore/firestoreAnnotations";
import { emitGameEndedActivity } from "../../services/session/emitSessionActivity";
import {
  isAloneHost,
  leaveRemoteSessionOnDevice,
} from "../../services/session/leaveRemoteSessionOnDevice";
import {
  clearSessionLocalArtifacts,
  teardownSessionUiState,
} from "../../services/session/sessionCleanup";
import { isExpectedSessionLeaveError } from "../../services/session/sessionLeaveErrors";
import { endSession } from "../../services/session/sessionLifecycle";
import { useSessionStore } from "../../state/sessionStore";
import { useSubmitLock } from "../forms/useSubmitLock";
import { useSessionExit } from "../session/useSessionExit";

function alertIfNeedsConnection(error: unknown): boolean {
  if (!isNeedsConnectionError(error)) {
    return false;
  }
  window.alert(callableErrorMessage(error, "Try again."));
  return true;
}

const MAP_EXPORT_BACKGROUND = "#0f172a";

const END_SESSION_AUTH_TIMEOUT_MS = 10_000;
const END_SESSION_ERROR_MESSAGE = "Couldn't end the session. Try again.";

const loadHtml2Canvas = () => import("html2canvas");

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
  const { isSubmitting: endInFlight, runLocked: runEndLocked } = useSubmitLock();

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

    if (!window.confirm("Remove all annotations for every player on this session?")) {
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
    if (!session || !isHost || session.id === LOCAL_SESSION_ID || resetInFlightRef.current) {
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

    const reset = async () => {
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
          endGameTruthAnchors: undefined,
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
      }
    };

    await reset().finally(() => {
      resetInFlightRef.current = false;
    });
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
    if (!session || session.id === LOCAL_SESSION_ID) {
      return;
    }

    await runEndLocked(async () => {
      let user: { uid: string };
      try {
        user = await withTimeout(
          ensureAnonymousUser(),
          END_SESSION_AUTH_TIMEOUT_MS,
          END_SESSION_ERROR_MESSAGE,
        );
      } catch (error) {
        captureException(error);
        window.alert(END_SESSION_ERROR_MESSAGE);
        return;
      }

      // Prefer live hostUid over the isHost prop so stale host chrome cannot
      // call the host-only end callable after a transfer.
      if (session.hostUid !== user.uid) {
        return;
      }

      if (!window.confirm("End this session for all players?")) {
        return;
      }

      const sessionId = session.id;
      try {
        await endSession(sessionId);
      } catch (error) {
        if (alertIfNeedsConnection(error)) {
          return;
        }
        if (isExpectedSessionLeaveError(error)) {
          trackSessionEnded("expected_already_ended");
        } else {
          captureException(error);
          commitWrite("session.end", () => endRemoteSession(sessionId));
          trackSessionEnded("fallback_client_end");
        }
      }
      emitGameEndedActivity(sessionId, {
        outcome: "ended_early",
        summary: "Session ended",
      });
      await exitSession({
        reason: "end",
        sessionId,
        replace: true,
        closeOverlays: closeSettingsPanel,
      });
    });
  }, [closeSettingsPanel, exitSession, runEndLocked, session]);

  const handleLeaveSession = useCallback(async () => {
    if (!session) {
      return;
    }

    const isLocalSession = session.id === LOCAL_SESSION_ID;
    let user: { uid: string } | null = null;
    if (!isLocalSession) {
      try {
        user = await ensureAnonymousUser();
      } catch (error) {
        captureException(error);
        window.alert("Couldn't leave the session. Try again.");
        return;
      }
    }

    // Prefer live hostUid over the isHost prop so stale host chrome cannot
    // call the host-only leave callable after a transfer.
    const isRemoteHost = !isLocalSession && user !== null && session.hostUid === user.uid;
    if (isRemoteHost && user) {
      const alone = isAloneHost(session);
      const confirmMessage = alone
        ? "You're the only player. Leaving will end this session."
        : "Another player will become host so others can keep playing. Leave anyway?";
      if (!window.confirm(confirmMessage)) {
        return;
      }
    } else if (
      !window.confirm("Leave this session on this device? Other players can keep playing.")
    ) {
      return;
    }

    if (isLocalSession) {
      trackSessionEnded("local");
    }

    if (!isLocalSession && user) {
      const leaveResult = await leaveRemoteSessionOnDevice({
        session,
        uid: user.uid,
        pendingQuestions,
      });
      if (leaveResult === "failed") {
        return;
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

    const task = createLoadTask({ label: "Exporting map", global: true, cancellable: false });
    const loaderStage = task.stage({
      kind: "fetch",
      label: "Loading capture tool",
      historyKey: "capture:loader",
    });
    const renderStage = task.stage({
      kind: "compute",
      label: "Capturing map",
      historyKey: "capture:render",
    });
    try {
      loaderStage.start();
      const { default: html2canvas } = await loadHtml2Canvas();
      loaderStage.finish();
      renderStage.start();
      // Let the chip paint before html2canvas blocks the main thread.
      await yieldToMain();
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
      task.complete();
      link.click();
    } catch (error) {
      task.fail(error);
      const message = error instanceof Error ? error.message : String(error);
      if (!isHtml2CanvasUnsupportedColorMessage(message)) {
        captureException(error);
      }
      window.alert("Could not export the map. Try again, or take a screenshot instead.");
    }

    if (exportLegendRef.current) {
      exportLegendRef.current.style.display = "none";
    }
  }, [exportLegendRef, mapShellRef, session]);

  return {
    handleClearMap,
    handleResetBoard,
    handleResetSession,
    handleEndSession,
    endInFlight,
    handleLeaveSession,
    exportMap,
  };
}
