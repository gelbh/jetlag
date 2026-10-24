import { useEffect, useRef, useState } from "react";
import { APP_VERSION } from "@/domain/device/changelog";
import type { SessionRecord } from "@/domain/map/annotations";
import { type JoinFailureReason, joinFailureReason } from "@/domain/session/join/joinFailureReason";
import { isPlaceholderGameArea } from "@/domain/session/join/joinPreviewGameArea";
import type { JoinSessionFormValues } from "@/domain/session/join/joinSessionForm";
import { sessionVersionMismatchMessage } from "@/domain/session/meta/sessionVersion";
import {
  isJoinRequestExpired,
  type JoinRequestRole,
  type JoinRequestStatus,
  type RoleJoinRequest,
} from "@/domain/session/players/joinRequest";
import type { PlayerRole } from "@/domain/session/players/playerRole";
import {
  isRolePasscodeRequired,
  joinRequiresRolePasscode,
} from "@/domain/session/players/roleGates";
import { useSubmitLock } from "@/hooks/forms/useSubmitLock";
import { useAppNavigate } from "@/hooks/navigation/useAppNavigate";
import { useJoinSessionPreview } from "@/hooks/session/useJoinSessionPreview";
import { copyToClipboard } from "@/platform/copyToClipboard";
import { ANALYTICS_EVENTS, track } from "@/services/core/analytics/analytics";
import { setPremiumApiContext } from "@/services/core/auth/premiumApiContext";
import { ensureFreshAnonymousUser, isFirebaseConfigured } from "@/services/core/firebase/firebase";
import { retryAsync } from "@/services/core/network/retryAsync";
import { withTimeout } from "@/services/core/withTimeout";
import {
  getRemoteSessionByIdFromServer,
  joinRemoteSessionByCode,
  waitForServerHiderRole,
} from "@/services/firestore/firestoreAnnotations";
import { resolveSessionMatchingAreas } from "@/services/geo/matching/resolveSessionMatchingAreas";
import { preloadCriticalGameAreaCaches } from "@/services/session/gameAreaPreload";
import { listenOwnJoinRequest } from "@/services/session/joinRequestListen";
import {
  cancelRoleJoinRequest,
  mapJoinRequestError,
  ROLE_CODE_REQUIRED_COPY,
  requestRoleJoin,
} from "@/services/session/rolePasscodeLifecycle";
import { useSessionStore } from "@/state/sessionStore";

const VERIFY_SESSION_TIMEOUT_MS = 15_000;
const VERIFY_SESSION_TIMEOUT_MESSAGE =
  "Couldn't verify the session. Check your connection and try again.";

type PendingJoinRequest = {
  requestId: string;
  sessionId: string;
  role: JoinRequestRole;
  expiresAt: string;
};

async function fetchAcceptedJoinSession(
  request: PendingJoinRequest,
  uid: string,
): Promise<SessionRecord> {
  const joinedSession = await getRemoteSessionByIdFromServer(request.sessionId);
  if (!joinedSession) {
    throw new Error("Couldn't load the session after approval.");
  }
  if (request.role !== "hider") {
    return joinedSession;
  }
  const confirmed = await waitForServerHiderRole(joinedSession.id, uid);
  if (!confirmed || confirmed.memberRoles?.[uid] !== "hider") {
    throw new Error("Couldn't confirm your hider role. Wait a moment and try again.");
  }
  return confirmed;
}

function isJoinRequestRole(role: PlayerRole): role is JoinRequestRole {
  return role === "seeker" || role === "hider" || role === "observer";
}

export function waitingLeaderCopy(role: JoinRequestRole): string {
  switch (role) {
    case "seeker":
      return "Waiting for seeker leader…";
    case "hider":
      return "Waiting for hider leader…";
    case "observer":
      return "Waiting for host…";
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}

function joinRequestStatusMessage(status: JoinRequestStatus): string {
  switch (status) {
    case "declined":
      return "Your join request was declined.";
    case "expired":
      return "Your join request expired. Try again or use a role code.";
    case "cancelled":
      return "Join request cancelled.";
    case "accepted":
    case "pending":
      return "";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export type UseJoinSessionArgs = {
  code: string;
  playerRole: PlayerRole;
  rolePasscode: string;
  onExistingRole?: (role: PlayerRole) => void;
};

export function useJoinSession({
  code,
  playerRole,
  rolePasscode: _rolePasscode,
  onExistingRole,
}: UseJoinSessionArgs) {
  void _rolePasscode;
  const navigate = useAppNavigate();
  const session = useSessionStore((state) => state.session);
  const myUid = useSessionStore((state) => state.myUid);
  const setSession = useSessionStore((state) => state.setSession);
  const onExistingRoleRef = useRef(onExistingRole);
  const joinAttemptRef = useRef(0);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { isSubmitting, runLocked } = useSubmitLock();
  const joinBusy = loading || isSubmitting;
  const [pendingRequest, setPendingRequest] = useState<PendingJoinRequest | null>(null);
  const [requestBusy, setRequestBusy] = useState(false);

  const { previewSession, previewPremium, lookupLoading, existingRole } =
    useJoinSessionPreview(code);

  const rolePasscodeOccupancyKnown = Boolean(
    previewSession && !isPlaceholderGameArea(previewSession.gameArea),
  );
  const needsRolePasscode = Boolean(
    previewSession &&
      joinRequiresRolePasscode(
        previewSession.memberRoles,
        playerRole,
        myUid ?? undefined,
        rolePasscodeOccupancyKnown,
      ),
  );
  const canRequestAccess =
    Boolean(previewSession) && needsRolePasscode && isJoinRequestRole(playerRole);
  const formBusy = joinBusy || requestBusy || pendingRequest != null;

  useEffect(() => {
    onExistingRoleRef.current = onExistingRole;
  }, [onExistingRole]);

  useEffect(() => {
    if (!existingRole) {
      return;
    }
    onExistingRoleRef.current?.(existingRole);
  }, [existingRole]);

  useEffect(() => {
    if (!pendingRequest) {
      return;
    }

    let cancelled = false;
    let accepting = false;

    const finishTerminal = (status: JoinRequestStatus) => {
      if (cancelled || accepting) {
        return;
      }
      setPendingRequest(null);
      setRequestBusy(false);
      const message = joinRequestStatusMessage(status);
      if (message) {
        setError(message);
      }
    };

    const completeAcceptedJoin = async () => {
      if (cancelled || accepting) {
        return;
      }
      accepting = true;
      setLoading(true);
      setError(null);

      try {
        const user = await retryAsync(() => ensureFreshAnonymousUser());
        const joinedSession = await fetchAcceptedJoinSession(pendingRequest, user.uid);

        const joinedRole = pendingRequest.role;
        setPendingRequest(null);
        setSession(joinedSession, user.uid);
        setPremiumApiContext(joinedSession);
        track(ANALYTICS_EVENTS.session_joined, { role: joinedRole });
        if (joinedSession.gameArea) {
          void (async () => {
            const matchingAreas = await resolveSessionMatchingAreas(joinedSession);
            void preloadCriticalGameAreaCaches(
              joinedSession.gameArea!,
              matchingAreas,
              joinedSession.regionPackId,
            );
          })();
        }
        navigate("/map");
      } catch (nextError) {
        setPendingRequest(null);
        setError(nextError instanceof Error ? nextError.message : "Couldn't join that session.");
      }
      setLoading(false);
      setRequestBusy(false);
    };

    const handleRequestUpdate = (request: RoleJoinRequest | null) => {
      if (cancelled || !request) {
        return;
      }

      if (request.status === "accepted") {
        void completeAcceptedJoin();
        return;
      }

      if (
        request.status === "declined" ||
        request.status === "cancelled" ||
        request.status === "expired" ||
        isJoinRequestExpired(request, Date.now())
      ) {
        finishTerminal(request.status === "pending" ? "expired" : request.status);
      }
    };

    const unsubscribe = listenOwnJoinRequest(
      pendingRequest.sessionId,
      pendingRequest.requestId,
      handleRequestUpdate,
      (listenError) => {
        if (cancelled) {
          return;
        }
        setPendingRequest(null);
        setRequestBusy(false);
        setError(listenError.message || "Couldn't watch join request.");
      },
    );

    const expiryTimestamp = Date.parse(pendingRequest.expiresAt);
    const expiresInMs = Number.isFinite(expiryTimestamp)
      ? expiryTimestamp - Date.now()
      : Number.MAX_SAFE_INTEGER;
    const MAX_TIMEOUT_MS = 2_147_483_647;
    let expiryTimer: number | undefined;

    if (Number.isFinite(expiresInMs) && expiresInMs > 0 && expiresInMs <= MAX_TIMEOUT_MS) {
      expiryTimer = window.setTimeout(() => {
        if (!cancelled && !accepting) {
          void cancelRoleJoinRequest(pendingRequest.sessionId, pendingRequest.requestId).catch(
            () => {},
          );
        }
        finishTerminal("expired");
      }, expiresInMs);
    }

    return () => {
      if (!accepting) {
        cancelled = true;
      }
      unsubscribe();
      if (expiryTimer !== undefined) {
        window.clearTimeout(expiryTimer);
      }
    };
  }, [navigate, pendingRequest, setSession]);

  const enterJoinedSession = async (
    joinedSession: SessionRecord,
    uid: string,
    role: PlayerRole,
    rolePasscodeMinted?: string,
  ) => {
    if (rolePasscodeMinted) {
      const copied = await copyToClipboard(rolePasscodeMinted);
      window.alert(
        copied
          ? `You're first on this side. Role code ${rolePasscodeMinted} was copied - share it with teammates.`
          : `You're first on this side. Your role code is ${rolePasscodeMinted} - share it with teammates.`,
      );
    }

    setSession(joinedSession, uid);
    setPremiumApiContext(joinedSession);
    track(ANALYTICS_EVENTS.session_joined, { role });
    if (joinedSession.gameArea) {
      void (async () => {
        const matchingAreas = await resolveSessionMatchingAreas(joinedSession);
        void preloadCriticalGameAreaCaches(
          joinedSession.gameArea!,
          matchingAreas,
          joinedSession.regionPackId,
        );
      })();
    }
    navigate("/map");
  };

  const trackJoinFailed = (role: PlayerRole, reason: JoinFailureReason) => {
    track(ANALYTICS_EVENTS.join_failed, { role, reason });
  };

  const runJoin = (values: JoinSessionFormValues) =>
    void runLocked(async () => {
      const attempt = ++joinAttemptRef.current;
      const isCurrent = () => joinAttemptRef.current === attempt;
      const normalized = values.code;
      // Per-submit: `settled` gates only the join_failed track call, so each submit emits at most
      // one join_failed. The user-visible error is always shown.
      let settled = false;
      // Set once the join succeeded: a client timeout that fires while the session is being entered must not show copy or track.
      let claimed = false;
      const fail = (message: string, role: PlayerRole, reason: JoinFailureReason) => {
        setError(message);
        if (settled) {
          return;
        }
        settled = true;
        trackJoinFailed(role, reason);
      };
      if (
        !values.rolePasscode &&
        existingRole !== values.playerRole &&
        isRolePasscodeRequired(previewSession, values.playerRole, myUid ?? undefined)
      ) {
        fail(ROLE_CODE_REQUIRED_COPY, values.playerRole, "role_code_required");
        return;
      }
      setLoading(true);
      setError(null);

      try {
        if (!isFirebaseConfigured()) {
          fail(
            "Firebase is not configured. Create a local session instead.",
            values.playerRole,
            "other",
          );
        } else {
          await withTimeout(
            (async () => {
              const user = await retryAsync(() => ensureFreshAnonymousUser());
              const joinOptions =
                session?.code === normalized && myUid
                  ? {
                      returningMemberUid: myUid,
                      persistedMyUid: myUid,
                      rolePasscode: values.rolePasscode || undefined,
                    }
                  : { rolePasscode: values.rolePasscode || undefined };
              const result = await retryAsync(() =>
                joinRemoteSessionByCode(
                  normalized,
                  user.uid,
                  values.playerRole,
                  APP_VERSION,
                  joinOptions,
                ),
              );
              if (result.status === "missing") {
                if (!isCurrent()) {
                  return;
                }
                fail("No session found for that code.", values.playerRole, "session_missing");
                return;
              }

              if (result.status === "ended") {
                if (!isCurrent()) {
                  return;
                }
                fail(
                  "That session has ended. Ask the host for a new code.",
                  values.playerRole,
                  "session_ended",
                );
                return;
              }

              if (result.status === "incompatible") {
                if (!isCurrent()) {
                  return;
                }
                fail(
                  sessionVersionMismatchMessage(result.hostVersion, APP_VERSION),
                  values.playerRole,
                  "version_mismatch",
                );
                return;
              }

              let joinedSession = result.session;
              if (values.playerRole === "hider") {
                const confirmed = await waitForServerHiderRole(joinedSession.id, user.uid);
                if (!confirmed || confirmed.memberRoles?.[user.uid] !== "hider") {
                  if (!isCurrent()) {
                    return;
                  }
                  fail(
                    "Couldn't confirm your hider role. Wait a moment and try again.",
                    values.playerRole,
                    "other",
                  );
                  return;
                }
                joinedSession = confirmed;
              }

              // A late success after the client timeout still enters the session: the server
              // already joined the player. Clear the timeout copy before navigating. A newer
              // submit owns the form state, so a superseded attempt must not touch it.
              if (!isCurrent()) {
                return;
              }
              settled = true;
              claimed = true;
              setError(null);
              await enterJoinedSession(
                joinedSession,
                user.uid,
                values.playerRole,
                result.rolePasscode,
              );
            })(),
            VERIFY_SESSION_TIMEOUT_MS,
            VERIFY_SESSION_TIMEOUT_MESSAGE,
          );
        }
      } catch (nextError) {
        const isVerifyTimeout =
          nextError instanceof Error && nextError.message === VERIFY_SESSION_TIMEOUT_MESSAGE;
        // A timeout after the join was claimed means the timer fired while enterJoinedSession
        // was still running. The join succeeded, so show nothing and track nothing.
        if (!(claimed && isVerifyTimeout)) {
          const reason: JoinFailureReason = isVerifyTimeout
            ? "timeout"
            : joinFailureReason(nextError);
          fail(
            nextError instanceof Error ? nextError.message : "Couldn't join that session.",
            values.playerRole,
            reason,
          );
        }
      }
      setLoading(false);
    });

  const onJoinValidationError = (message: string) => {
    setError(message);
  };

  const handleRequestAccess = () =>
    void runLocked(async () => {
      if (!previewSession || !isJoinRequestRole(playerRole)) {
        return;
      }

      setRequestBusy(true);
      setError(null);

      try {
        if (!isFirebaseConfigured()) {
          setError("Firebase is not configured. Create a local session instead.");
        } else {
          await ensureFreshAnonymousUser();
          const result = await requestRoleJoin(previewSession.id, playerRole);
          setPendingRequest({
            requestId: result.requestId,
            sessionId: previewSession.id,
            role: playerRole,
            expiresAt: result.expiresAt,
          });
        }
      } catch (nextError) {
        setError(mapJoinRequestError(nextError));
      }
      setRequestBusy(false);
    });

  const handleCancelRequest = () =>
    void runLocked(async () => {
      if (!pendingRequest) {
        return;
      }

      setRequestBusy(true);
      setError(null);

      try {
        await cancelRoleJoinRequest(pendingRequest.sessionId, pendingRequest.requestId);
        setPendingRequest(null);
        setError("Join request cancelled.");
      } catch (nextError) {
        setError(mapJoinRequestError(nextError));
      }
      setRequestBusy(false);
    });

  return {
    previewSession,
    previewPremium,
    lookupLoading,
    existingRole,
    needsRolePasscode,
    rolePasscodeOccupancyKnown,
    canRequestAccess,
    error,
    setError,
    loading,
    joinBusy,
    requestBusy,
    formBusy,
    pendingRequest,
    runJoin,
    onJoinValidationError,
    handleRequestAccess,
    handleCancelRequest,
    waitingLeaderCopy,
  };
}
