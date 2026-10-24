import { useCallback, useEffect, useRef, useState } from "react";
import type { AdminSessionSummary } from "../../../services/admin/adminSessions";
import { useSessionStore } from "../../../state/sessionStore";
import type { AdminSessionMonitorState } from "./AdminSessionView";

interface Inputs {
  enabled: boolean;
  isDesktop: boolean;
  routeSessionId: string | null;
  routeSession: AdminSessionSummary | null | undefined;
  joinSession: (
    summary: Pick<AdminSessionSummary, "sessionId" | "code">,
    options?: { navigate?: boolean },
  ) => Promise<boolean>;
  observingCode: string | null;
  observeError: string | null;
}

/** Desktop session-route monitor join (once per route session; retry on fail). */
export function useAdminDeskMonitor({
  enabled,
  isDesktop,
  routeSessionId,
  routeSession,
  joinSession,
  observingCode,
  observeError,
}: Inputs): AdminSessionMonitorState {
  const activeSession = useSessionStore((state) => state.session);
  const activeRole = useSessionStore((state) => state.myRole);
  const [monitorSessionId, setMonitorSessionId] = useState<string | null>(null);
  const [failedSessionId, setFailedSessionId] = useState<string | null>(null);
  const monitorRequestRef = useRef(0);
  const joinKeyRef = useRef<string | null>(null);

  const joinForMonitor = useCallback(
    async (summary: Pick<AdminSessionSummary, "sessionId" | "code">) => {
      const requestId = ++monitorRequestRef.current;
      const joined = await joinSession(summary, { navigate: false });
      if (monitorRequestRef.current !== requestId) return;
      if (!joined) {
        setFailedSessionId(summary.sessionId);
        setMonitorSessionId((current) => (current === summary.sessionId ? null : current));
        return;
      }
      setFailedSessionId((current) => (current === summary.sessionId ? null : current));
      setMonitorSessionId(summary.sessionId);
    },
    [joinSession],
  );

  // Only the session route monitors; incident and request routes never join.
  useEffect(() => {
    if (!enabled || !isDesktop || !routeSessionId) {
      joinKeyRef.current = null;
      return;
    }
    if (monitorSessionId === routeSessionId && activeSession?.id === routeSessionId) {
      joinKeyRef.current = routeSessionId;
      return;
    }
    if (!routeSession || joinKeyRef.current === routeSessionId) return;
    joinKeyRef.current = routeSessionId;
    void joinForMonitor(routeSession);
  }, [
    activeSession?.id,
    enabled,
    isDesktop,
    joinForMonitor,
    monitorSessionId,
    routeSession,
    routeSessionId,
  ]);

  const roleError =
    routeSessionId != null &&
    monitorSessionId === routeSessionId &&
    activeSession?.id === routeSessionId &&
    activeRole !== "admin"
      ? (observeError ?? "Couldn't confirm admin monitor role after joining. Try again.")
      : null;

  return {
    active:
      isDesktop &&
      routeSessionId != null &&
      monitorSessionId === routeSessionId &&
      activeSession?.id === routeSessionId &&
      activeRole === "admin",
    roleError,
    joinError:
      failedSessionId === routeSessionId
        ? (observeError ?? "Couldn't open the map for this session.")
        : null,
    joining: routeSession != null && observingCode === routeSession.code,
    onRetry: () => {
      if (routeSession) void joinForMonitor(routeSession);
    },
  };
}
