import { useCallback, useEffect, useMemo, useState } from "react";
import {
  isJoinRequestExpired,
  type RoleJoinRequest,
} from "../../domain/session/players/joinRequest";
import {
  ledJoinRequestRoles,
  type RoleGates,
} from "../../domain/session/players/roleGates";
import { listenLeaderJoinRequests } from "../../services/session/joinRequestListen";
import { resolveRoleJoinRequest } from "../../services/session/rolePasscodeLifecycle";

/** Mirrors domain/map/annotations LOCAL_SESSION_ID without the annotations barrel. */
const LOCAL_SESSION_ID = "local";

interface UseLeaderJoinRequestsParams {
  sessionId: string | null | undefined;
  roleGates?: RoleGates | null;
  myUid: string | undefined;
  isHost: boolean;
}

export function useLeaderJoinRequests({
  sessionId,
  roleGates,
  myUid,
  isHost,
}: UseLeaderJoinRequestsParams) {
  const [requests, setRequests] = useState<RoleJoinRequest[]>([]);
  const [busy, setBusy] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const roles = useMemo(
    () => ledJoinRequestRoles({ roleGates, myUid, isHost }),
    [isHost, myUid, roleGates],
  );

  const enabled =
    Boolean(sessionId) &&
    sessionId !== LOCAL_SESSION_ID &&
    roles.length > 0;

  useEffect(() => {
    if (!enabled || !sessionId) {
      setRequests((prev) => (prev.length === 0 ? prev : []));
      return;
    }

    return listenLeaderJoinRequests(
      sessionId,
      roles,
      setRequests,
      () => {
        setRequests([]);
      },
    );
  }, [enabled, roles, sessionId]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const id = window.setInterval(() => setNowMs(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, [enabled]);

  const pendingRequest = useMemo(() => {
    return (
      requests.find(
        (request) =>
          request.status === "pending" &&
          !isJoinRequestExpired(request, nowMs),
      ) ?? null
    );
  }, [nowMs, requests]);

  const resolve = useCallback(
    async (decision: "accept" | "decline") => {
      if (!sessionId || !pendingRequest || busy) {
        return;
      }

      setBusy(true);
      try {
        await resolveRoleJoinRequest(sessionId, pendingRequest.id, decision);
      } catch {
        // Leave the alert visible so the leader can retry.
      } finally {
        setBusy(false);
      }
    },
    [busy, pendingRequest, sessionId],
  );

  const handleAcceptJoinRequest = useCallback(() => {
    void resolve("accept");
  }, [resolve]);

  const handleDeclineJoinRequest = useCallback(() => {
    void resolve("decline");
  }, [resolve]);

  return {
    pendingJoinRequest: pendingRequest,
    joinRequestBusy: busy,
    handleAcceptJoinRequest,
    handleDeclineJoinRequest,
  };
}
