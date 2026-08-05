import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAppNavigate } from "../hooks/navigation/useAppNavigate";
import { useSubmitLock } from "../hooks/forms/useSubmitLock";
import { DesktopContentColumn } from "../components/ui/layout/DesktopContentColumn";
import { EntryScreenLayout } from "../components/ui/layout/EntryScreenLayout";
import { InlineError } from "../components/ui/banners/InlineError";
import { TextField } from "../components/ui/forms/TextField";
import {
  ScreenHeader,
  screenHeaderOffsetClassName,
} from "../components/ui/layout/ScreenHeader";
import { isPremiumSession } from "../domain/map/annotations";
import {
  SESSION_CODE_INPUT_PLACEHOLDER,
  isValidSessionCode,
  normalizeSessionCode,
} from "../services/session/sessionCodes";
import { parseSessionInviteCode } from "../services/session/sessionInviteUrl";
import { useSessionStore } from "../state/sessionStore";
import type { PlayerRole } from "../domain/session/players/playerRole";
import { joinRequiresRolePasscode } from "../domain/session/players/roleGates";
import {
  isJoinRequestExpired,
  type JoinRequestRole,
  type JoinRequestStatus,
  type RoleJoinRequest,
} from "../domain/session/players/joinRequest";
import { normalizeRolePasscode } from "../domain/session/players/rolePasscode";
import type { SessionRecord } from "../domain/map/annotations";
import { RolePicker } from "../components/session/identity/RolePicker";
import { copyToClipboard } from "../platform/copyToClipboard";
import {
  ensureAnonymousUser,
  ensureFreshAnonymousUser,
  isFirebaseConfigured,
} from "../services/core/firebase/firebase";
import {
  getRemoteSessionByIdFromServer,
  joinRemoteSessionByCode,
  lookupRemoteSessionByCode,
  waitForServerHiderRole,
} from "../services/firestore/firestoreAnnotations";
import { APP_VERSION } from "../domain/device/changelog";
import { sessionVersionMismatchMessage } from "../domain/session/meta/sessionVersion";
import { resolvePlayerRole } from "../domain/session/players/playerRole";
import { retryAsync } from "../services/core/network/retryAsync";
import { withTimeout } from "../services/core/withTimeout";
import { MotionPressable } from "../components/motion/MotionPressable";
import {
  ANALYTICS_EVENTS,
  track,
} from "../services/core/analytics/analytics";
import { setPremiumApiContext } from "../services/core/auth/premiumApiContext";
import { preloadCriticalGameAreaCaches } from "../services/session/gameAreaPreload";
import { resolveSessionMatchingAreas } from "../services/geo/matching/resolveSessionMatchingAreas";
import {
  getCachedJoinPreview,
  JOIN_PREVIEW_DEBOUNCE_MS,
  setCachedJoinPreview,
} from "../services/session/joinSessionPreviewCache";
import {
  cancelRoleJoinRequest,
  mapJoinRequestError,
  requestRoleJoin,
} from "../services/session/rolePasscodeLifecycle";
import { listenOwnJoinRequest } from "../services/session/joinRequestListen";

const VERIFY_SESSION_TIMEOUT_MS = 15_000;
const VERIFY_SESSION_TIMEOUT_MESSAGE =
  "Couldn't verify the session. Check your connection and try again.";

type JoinPreviewResult = Awaited<ReturnType<typeof lookupRemoteSessionByCode>>;

type PendingJoinRequest = {
  requestId: string;
  sessionId: string;
  role: JoinRequestRole;
  expiresAt: string;
};

function isJoinRequestRole(role: PlayerRole): role is JoinRequestRole {
  return role === "seeker" || role === "hider" || role === "observer";
}

function waitingLeaderCopy(role: JoinRequestRole): string {
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

export function JoinSession() {
  const navigate = useAppNavigate();
  const [searchParams] = useSearchParams();
  const session = useSessionStore((state) => state.session);
  const myUid = useSessionStore((state) => state.myUid);
  const setSession = useSessionStore((state) => state.setSession);
  const codeFromQuery = searchParams.get("code");
  const [code, setCode] = useState(
    () => parseSessionInviteCode(codeFromQuery) ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { isSubmitting, runLocked } = useSubmitLock();
  const joinBusy = loading || isSubmitting;
  const [previewPremium, setPreviewPremium] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [playerRole, setPlayerRole] = useState<PlayerRole>("hider");
  const [rolePasscode, setRolePasscode] = useState("");
  const [previewSession, setPreviewSession] = useState<SessionRecord | null>(null);
  const [pendingRequest, setPendingRequest] = useState<PendingJoinRequest | null>(
    null,
  );
  const [requestBusy, setRequestBusy] = useState(false);
  const needsRolePasscode = joinRequiresRolePasscode(
    previewSession?.memberRoles,
    playerRole,
    myUid ?? undefined,
  );
  const canRequestAccess =
    Boolean(previewSession) &&
    needsRolePasscode &&
    isJoinRequestRole(playerRole);
  const formBusy = joinBusy || requestBusy || pendingRequest != null;

  useEffect(() => {
    const next = parseSessionInviteCode(codeFromQuery);
    /* eslint-disable react-hooks/set-state-in-effect -- sync join code when invite query changes */
    setPreviewSession(null);
    setPreviewPremium(false);
    setLookupLoading(false);

    if (!next) {
      if (codeFromQuery) {
        setCode("");
      }
      return;
    }
    setCode(next);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [codeFromQuery]);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      return;
    }

    const normalized = normalizeSessionCode(code);
    if (!isValidSessionCode(normalized)) {
      /* eslint-disable react-hooks/set-state-in-effect -- clear stale preview when code changes */
      setPreviewPremium(false);
      setLookupLoading(false);
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }

    let cancelled = false;

    const applyPreview = (result: JoinPreviewResult, uid: string) => {
      setPreviewPremium(
        result.status === "found" && isPremiumSession(result.session),
      );
      if (result.status === "found") {
        setPreviewSession(result.session);
        const existingRole = resolvePlayerRole(
          result.session.memberRoles,
          uid,
        );
        if (result.session.memberRoles?.[uid]) {
          setPlayerRole(existingRole);
        }
      } else {
        setPreviewSession(null);
      }
      if (result.status === "missing") {
        setError(null);
      }
    };

    const cached = getCachedJoinPreview<JoinPreviewResult>(normalized);
    if (cached) {
      setLookupLoading(true);
      void (async () => {
        try {
          const user = await ensureAnonymousUser();
          if (cancelled) {
            return;
          }
          applyPreview(cached, user.uid);
        } catch {
          if (!cancelled) {
            setPreviewPremium(false);
          }
        } finally {
          if (!cancelled) {
            setLookupLoading(false);
          }
        }
      })();
      return () => {
        cancelled = true;
      };
    }

    setLookupLoading(true);
    const debounceTimer = window.setTimeout(() => {
      void (async () => {
        try {
          const user = await ensureAnonymousUser();
          const result = await retryAsync(() =>
            lookupRemoteSessionByCode(normalized),
          );
          if (cancelled) {
            return;
          }

          setCachedJoinPreview(normalized, result);
          applyPreview(result, user.uid);
        } catch {
          if (!cancelled) {
            setPreviewPremium(false);
          }
        } finally {
          if (!cancelled) {
            setLookupLoading(false);
          }
        }
      })();
    }, JOIN_PREVIEW_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(debounceTimer);
    };
  }, [code]);

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
        let joinedSession = await getRemoteSessionByIdFromServer(
          pendingRequest.sessionId,
        );
        if (!joinedSession) {
          throw new Error("Couldn't load the session after approval.");
        }

        if (pendingRequest.role === "hider") {
          const confirmed = await waitForServerHiderRole(
            joinedSession.id,
            user.uid,
          );
          if (!confirmed || confirmed.memberRoles?.[user.uid] !== "hider") {
            throw new Error(
              "Couldn't confirm your hider role. Wait a moment and try again.",
            );
          }
          joinedSession = confirmed;
        }

        const joinedRole = pendingRequest.role;
        setPendingRequest(null);
        setSession(joinedSession, user.uid);
        setPremiumApiContext(joinedSession);
        track(ANALYTICS_EVENTS.session_joined, { role: joinedRole });
        if (joinedSession.gameArea) {
          void (async () => {
            const matchingAreas =
              await resolveSessionMatchingAreas(joinedSession);
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
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Couldn't join that session.",
        );
      } finally {
        setLoading(false);
        setRequestBusy(false);
      }
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
        finishTerminal(
          request.status === "pending" ? "expired" : request.status,
        );
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
    // setTimeout delays above 2^31-1 overflow and fire immediately.
    const MAX_TIMEOUT_MS = 2_147_483_647;
    let expiryTimer: number | undefined;

    // Only set up a timer if the expiry is in the future and within the max timeout range.
    // Don't immediately call finishTerminal for past expiry, as the listener may still report
    // the request as accepted before recognizing expiry.
    if (Number.isFinite(expiresInMs) && expiresInMs > 0 && expiresInMs <= MAX_TIMEOUT_MS) {
      expiryTimer = window.setTimeout(() => {
        if (!cancelled && !accepting) {
          void cancelRoleJoinRequest(
            pendingRequest.sessionId,
            pendingRequest.requestId,
          ).catch(() => {
            // Ignore errors if cancellation fails
          });
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
          ? `You're first on this side. Role code ${rolePasscodeMinted} was copied — share it with teammates.`
          : `You're first on this side. Your role code is ${rolePasscodeMinted} — share it with teammates.`,
      );
    }

    setSession(joinedSession, uid);
    setPremiumApiContext(joinedSession);
    track(ANALYTICS_EVENTS.session_joined, { role });
    if (joinedSession.gameArea) {
      void (async () => {
        const matchingAreas =
          await resolveSessionMatchingAreas(joinedSession);
        void preloadCriticalGameAreaCaches(
          joinedSession.gameArea!,
          matchingAreas,
          joinedSession.regionPackId,
        );
      })();
    }
    navigate("/map");
  };

  const handleJoin = () =>
    void runLocked(async () => {
    const normalized = normalizeSessionCode(code);
    if (!isValidSessionCode(normalized)) {
      setError("Enter a 4-letter session code.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (!isFirebaseConfigured()) {
        setError("Firebase is not configured. Create a local session instead.");
        return;
      }

      await withTimeout(
        (async () => {
          const user = await retryAsync(() => ensureFreshAnonymousUser());
          const joinOptions =
            session?.code === normalized && myUid
              ? {
                  returningMemberUid: myUid,
                  persistedMyUid: myUid,
                  rolePasscode: rolePasscode || undefined,
                }
              : { rolePasscode: rolePasscode || undefined };
          const result = await retryAsync(() =>
            joinRemoteSessionByCode(
              normalized,
              user.uid,
              playerRole,
              APP_VERSION,
              joinOptions,
            ),
          );
          if (result.status === "missing") {
            setError("No session found for that code.");
            return;
          }

          if (result.status === "ended") {
            setError("That session has ended. Ask the host for a new code.");
            return;
          }

          if (result.status === "incompatible") {
            setError(
              sessionVersionMismatchMessage(result.hostVersion, APP_VERSION),
            );
            return;
          }

          let joinedSession = result.session;
          if (playerRole === "hider") {
            const confirmed = await waitForServerHiderRole(
              joinedSession.id,
              user.uid,
            );
            if (!confirmed || confirmed.memberRoles?.[user.uid] !== "hider") {
              setError(
                "Couldn't confirm your hider role. Wait a moment and try again.",
              );
              return;
            }
            joinedSession = confirmed;
          }

          await enterJoinedSession(
            joinedSession,
            user.uid,
            playerRole,
            result.rolePasscode,
          );
        })(),
        VERIFY_SESSION_TIMEOUT_MS,
        VERIFY_SESSION_TIMEOUT_MESSAGE,
      );
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Couldn't join that session.",
      );
    } finally {
      setLoading(false);
    }
  });

  const handleRequestAccess = () =>
    void runLocked(async () => {
      if (!previewSession || !isJoinRequestRole(playerRole)) {
        return;
      }

      setRequestBusy(true);
      setError(null);

      try {
        if (!isFirebaseConfigured()) {
          setError(
            "Firebase is not configured. Create a local session instead.",
          );
          return;
        }

        await ensureFreshAnonymousUser();
        const result = await requestRoleJoin(previewSession.id, playerRole);
        setPendingRequest({
          requestId: result.requestId,
          sessionId: previewSession.id,
          role: playerRole,
          expiresAt: result.expiresAt,
        });
      } catch (nextError) {
        setError(mapJoinRequestError(nextError));
      } finally {
        setRequestBusy(false);
      }
    });

  const handleCancelRequest = () =>
    void runLocked(async () => {
      if (!pendingRequest) {
        return;
      }

      setRequestBusy(true);
      setError(null);

      try {
        await cancelRoleJoinRequest(
          pendingRequest.sessionId,
          pendingRequest.requestId,
        );
        setPendingRequest(null);
        setError("Join request cancelled.");
      } catch (nextError) {
        setError(mapJoinRequestError(nextError));
      } finally {
        setRequestBusy(false);
      }
    });

  return (
    <EntryScreenLayout justify="center">
      <ScreenHeader backTo="/" backLabel="Back" />
      <DesktopContentColumn maxWidth="entry" className="flex flex-col gap-8">
        <div className={screenHeaderOffsetClassName}>
          <p className="mt-3 font-display text-sm font-semibold uppercase tracking-[0.2em] text-brand-blue">
            Join game
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold uppercase leading-none tracking-tight text-ink">
            Session code
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-muted">
            Enter the four letters your host shared. Everyone in the session sees
            the same live map.
          </p>
        </div>

        <div className="desktop-entry-actions jl-field-frame space-y-4">
          {pendingRequest ? (
            <>
              <p className="font-display text-sm font-semibold uppercase tracking-[0.12em] text-ink">
                {waitingLeaderCopy(pendingRequest.role)}
              </p>
              <p className="text-sm leading-relaxed text-ink-muted">
                Stay on this screen. You&apos;ll join automatically when the
                leader accepts.
              </p>
              <MotionPressable
                type="button"
                onClick={() => void handleCancelRequest()}
                disabled={requestBusy || loading}
                className="btn-secondary home-entry-action min-h-14 w-full disabled:opacity-50"
              >
                {requestBusy ? "Cancelling…" : "Cancel request"}
              </MotionPressable>
              {error ? <InlineError>{error}</InlineError> : null}
            </>
          ) : (
            <>
              <TextField
                id="join-session-code"
                label="Code"
                labelClassName="field-label font-display text-xs uppercase tracking-[0.12em]"
                inputClassName="field-input mt-2 min-h-16 border-0 bg-transparent p-0 text-center font-mono text-4xl font-bold tracking-[0.45em] focus:outline-none"
                value={code}
                onChange={(event) =>
                  setCode(normalizeSessionCode(event.target.value))
                }
                maxLength={4}
                placeholder={SESSION_CODE_INPUT_PLACEHOLDER}
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
              />

              {previewPremium ? (
                <p className="font-display text-xs font-semibold uppercase tracking-wide text-status-info">
                  Premium · live transit
                </p>
              ) : null}
              {lookupLoading ? (
                <p className="text-sm text-ink-dim">Checking session…</p>
              ) : null}

              <RolePicker
                value={playerRole}
                onChange={(role) => {
                  track(ANALYTICS_EVENTS.role_selected, {
                    role,
                    surface: "join",
                  });
                  setPlayerRole(role);
                  setRolePasscode("");
                }}
                disabled={formBusy}
                includeObserver
              />

              {needsRolePasscode ? (
                <div>
                  <TextField
                    id="join-session-role-code"
                    label="Role code"
                    labelClassName="field-label font-display text-xs uppercase tracking-[0.12em]"
                    inputClassName="field-input mt-2 min-h-12 w-full text-center font-mono text-2xl font-bold tracking-[0.35em]"
                    value={rolePasscode}
                    onChange={(event) =>
                      setRolePasscode(normalizeRolePasscode(event.target.value))
                    }
                    maxLength={4}
                    placeholder="Team code"
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  <span className="mt-2 block text-xs normal-case tracking-normal text-ink-muted">
                    {playerRole === "observer"
                      ? "Ask the host for the observer code."
                      : "Leave blank if you're first on that side; otherwise ask a teammate for the role code."}
                  </span>
                </div>
              ) : null}

              <MotionPressable
                type="button"
                onClick={() => void handleJoin()}
                disabled={formBusy}
                className="btn-primary home-entry-action min-h-14 w-full disabled:opacity-50"
              >
                {joinBusy ? "Joining…" : "Join session"}
              </MotionPressable>

              {canRequestAccess ? (
                <MotionPressable
                  type="button"
                  onClick={() => void handleRequestAccess()}
                  disabled={formBusy}
                  className="btn-secondary home-entry-action min-h-14 w-full disabled:opacity-50"
                >
                  {requestBusy ? "Requesting…" : "Request access"}
                </MotionPressable>
              ) : null}

              {error ? <InlineError>{error}</InlineError> : null}
            </>
          )}
        </div>
      </DesktopContentColumn>
    </EntryScreenLayout>
  );
}
