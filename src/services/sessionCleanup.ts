import { useTimerStore } from "../state/timerStore";
import { useSessionStore } from "../state/sessionStore";
import { clearOfflineQueueForSession } from "./offlineQueue";

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
