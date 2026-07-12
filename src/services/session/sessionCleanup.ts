import { useMapStore } from "../../state/mapStore";
import { useAnnotationStore } from "../../state/annotationStore";
import { usePreloadStore } from "../../state/preloadStore";
import { useSessionStore } from "../../state/sessionStore";
import { useTimerStore } from "../../state/timerStore";
import { setPremiumApiContext } from "../core/premiumApiContext";
import { abortActiveGameAreaPreload } from "./gameAreaPreload";
import { clearOfflineQueueForSession } from "./offlineQueue";

export function teardownSessionUiState(): void {
  useMapStore.getState().setActiveTool("none");
  useAnnotationStore.getState().setSelectedAnnotationId(null);
  useAnnotationStore.getState().setGeometryEditAnnotationId(null);
  useAnnotationStore.getState().clearRedoStack();
  setPremiumApiContext(null);
  abortActiveGameAreaPreload();
  usePreloadStore.setState({
    activeGameAreaKey: null,
    totalJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    dismissed: true,
    adminDivisionCounts: null,
  });
}

export async function clearSessionLocalArtifacts(
  sessionId: string,
): Promise<void> {
  useTimerStore.getState().clearTimer(sessionId);
  useSessionStore.getState().setRemoteUpdateNotice(null);
  useSessionStore.getState().setLastSyncError(null);
  await clearOfflineQueueForSession(sessionId);
}

export function pruneStaleTimerSessions(): void {
  const currentSessionId = useSessionStore.getState().session?.id;
  const { bySessionId, clearTimer } = useTimerStore.getState();

  for (const sessionId of Object.keys(bySessionId)) {
    if (sessionId !== currentSessionId) {
      clearTimer(sessionId);
    }
  }
}
