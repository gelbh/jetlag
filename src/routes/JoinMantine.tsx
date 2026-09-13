import {
  Alert,
  Button,
  Container,
  Paper,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAppNavigate } from "@/hooks/navigation/useAppNavigate";
import { useSubmitLock } from "@/hooks/forms/useSubmitLock";
import {
  joinSessionFormSchema,
  type JoinSessionFormValues,
} from "@/domain/session/join/joinSessionForm";
import {
  SESSION_CODE_INPUT_PLACEHOLDER,
  normalizeSessionCode,
} from "@/services/session/sessionCodes";
import { parseSessionInviteCode } from "@/services/session/sessionInviteUrl";
import { useSessionStore } from "@/state/sessionStore";
import type { PlayerRole } from "@/domain/session/players/playerRole";
import { playerRoleLabel } from "@/domain/session/players/playerRole";
import { joinRequiresRolePasscode } from "@/domain/session/players/roleGates";
import {
  isJoinRequestExpired,
  type JoinRequestRole,
  type JoinRequestStatus,
  type RoleJoinRequest,
} from "@/domain/session/players/joinRequest";
import { normalizeRolePasscode } from "@/domain/session/players/rolePasscode";
import type { SessionRecord } from "@/domain/map/annotations";
import { copyToClipboard } from "@/platform/copyToClipboard";
import {
  ensureFreshAnonymousUser,
  isFirebaseConfigured,
} from "@/services/core/firebase/firebase";
import {
  getRemoteSessionByIdFromServer,
  joinRemoteSessionByCode,
  waitForServerHiderRole,
} from "@/services/firestore/firestoreAnnotations";
import { APP_VERSION } from "@/domain/device/changelog";
import { sessionVersionMismatchMessage } from "@/domain/session/meta/sessionVersion";
import { retryAsync } from "@/services/core/network/retryAsync";
import { withTimeout } from "@/services/core/withTimeout";
import {
  ANALYTICS_EVENTS,
  track,
} from "@/services/core/analytics/analytics";
import { setPremiumApiContext } from "@/services/core/auth/premiumApiContext";
import { preloadCriticalGameAreaCaches } from "@/services/session/gameAreaPreload";
import { resolveSessionMatchingAreas } from "@/services/geo/matching/resolveSessionMatchingAreas";
import { useJoinSessionPreview } from "@/hooks/session/useJoinSessionPreview";
import {
  cancelRoleJoinRequest,
  mapJoinRequestError,
  requestRoleJoin,
} from "@/services/session/rolePasscodeLifecycle";
import { listenOwnJoinRequest } from "@/services/session/joinRequestListen";

const VERIFY_SESSION_TIMEOUT_MS = 15_000;
const VERIFY_SESSION_TIMEOUT_MESSAGE =
  "Couldn't verify the session. Check your connection and try again.";

const JOIN_ROLE_OPTIONS: Array<{ value: PlayerRole; label: string }> = [
  { value: "seeker", label: playerRoleLabel("seeker") },
  { value: "hider", label: playerRoleLabel("hider") },
  { value: "observer", label: playerRoleLabel("observer") },
];

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

function validateJoinForm(values: JoinSessionFormValues) {
  const parsed = joinSessionFormSchema.safeParse(values);
  if (parsed.success) {
    return {};
  }
  const errors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && errors[key] == null) {
      errors[key] = issue.message;
    }
  }
  return errors;
}

export function JoinMantine() {
  const navigate = useAppNavigate();
  const [searchParams] = useSearchParams();
  const session = useSessionStore((state) => state.session);
  const myUid = useSessionStore((state) => state.myUid);
  const setSession = useSessionStore((state) => state.setSession);
  const codeFromQuery = searchParams.get("code");

  const form = useForm<JoinSessionFormValues>({
    mode: "controlled",
    initialValues: {
      code: parseSessionInviteCode(codeFromQuery) ?? "",
      playerRole: "hider",
      rolePasscode: "",
    },
    validate: validateJoinForm,
  });

  const code = form.values.code;
  const playerRole = form.values.playerRole;
  /** When invite query is removed, keep typed code but suppress cached preview. */
  const [suppressPreview, setSuppressPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { isSubmitting, runLocked } = useSubmitLock();
  const joinBusy = loading || isSubmitting;
  const [pendingRequest, setPendingRequest] = useState<PendingJoinRequest | null>(
    null,
  );
  const [requestBusy, setRequestBusy] = useState(false);
  const {
    previewSession,
    previewPremium,
    lookupLoading,
    existingRole,
  } = useJoinSessionPreview(suppressPreview ? "" : code);
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
    if (!next) {
      if (codeFromQuery) {
        setSuppressPreview(false);
        form.setFieldValue("code", "");
      } else {
        setSuppressPreview(true);
      }
      return;
    }
    setSuppressPreview(false);
    form.setFieldValue("code", next);
    // form identity is stable enough; only re-sync when invite query changes
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: avoid re-running on every form render
  }, [codeFromQuery]);

  useEffect(() => {
    if (!existingRole) {
      return;
    }
    form.setFieldValue("playerRole", existingRole);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync when preview reports existing role
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
    if (
      Number.isFinite(expiresInMs) &&
      expiresInMs > 0 &&
      expiresInMs <= MAX_TIMEOUT_MS
    ) {
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
          ? `You're first on this side. Role code ${rolePasscodeMinted} was copied - share it with teammates.`
          : `You're first on this side. Your role code is ${rolePasscodeMinted} - share it with teammates.`,
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

  const handleJoin = form.onSubmit(
    (values) =>
      void runLocked(async () => {
        const normalized = values.code;
        setLoading(true);
        setError(null);

        try {
          if (!isFirebaseConfigured()) {
            setError(
              "Firebase is not configured. Create a local session instead.",
            );
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
                setError("No session found for that code.");
                return;
              }

              if (result.status === "ended") {
                setError(
                  "That session has ended. Ask the host for a new code.",
                );
                return;
              }

              if (result.status === "incompatible") {
                setError(
                  sessionVersionMismatchMessage(
                    result.hostVersion,
                    APP_VERSION,
                  ),
                );
                return;
              }

              let joinedSession = result.session;
              if (values.playerRole === "hider") {
                const confirmed = await waitForServerHiderRole(
                  joinedSession.id,
                  user.uid,
                );
                if (
                  !confirmed ||
                  confirmed.memberRoles?.[user.uid] !== "hider"
                ) {
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
                values.playerRole,
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
      }),
    (fieldErrors) => {
      setError(
        fieldErrors.code ??
          fieldErrors.rolePasscode ??
          "Check the join form and try again.",
      );
    },
  );

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

  const codeInputProps = form.getInputProps("code");
  const rolePasscodeInputProps = form.getInputProps("rolePasscode");

  return (
    <Container size="sm" py="xl">
      <Paper p="lg" radius="md" withBorder>
        <Stack gap="md">
          <Button component={Link} to="/" variant="subtle" w="fit-content" px={0}>
            Back
          </Button>
          <div>
            <Text size="sm" tt="uppercase" fw={600} c="dimmed">
              Join game
            </Text>
            <Title order={1} mt="xs">
              Session code
            </Title>
            <Text mt="sm" c="dimmed" size="sm">
              Enter the four letters your host shared. Everyone in the session
              sees the same live map.
            </Text>
          </div>

          {pendingRequest ? (
            <Stack gap="sm">
              <Text fw={600}>{waitingLeaderCopy(pendingRequest.role)}</Text>
              <Text size="sm" c="dimmed">
                Stay on this screen. You&apos;ll join automatically when the
                leader accepts.
              </Text>
              <Button
                variant="default"
                onClick={() => void handleCancelRequest()}
                disabled={requestBusy || loading}
                loading={requestBusy}
              >
                {requestBusy ? "Cancelling…" : "Cancel request"}
              </Button>
              {error ? (
                <Alert color="red" title="Join request">
                  {error}
                </Alert>
              ) : null}
            </Stack>
          ) : (
            <form onSubmit={handleJoin}>
              <Stack gap="md">
                <TextInput
                  id="join-session-code"
                  label="Code"
                  {...codeInputProps}
                  onChange={(event) => {
                    setSuppressPreview(false);
                    form.setFieldValue(
                      "code",
                      normalizeSessionCode(event.currentTarget.value),
                    );
                  }}
                  maxLength={4}
                  placeholder={SESSION_CODE_INPUT_PLACEHOLDER}
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  styles={{
                    input: {
                      textAlign: "center",
                      fontFamily: "monospace",
                      fontSize: "1.75rem",
                      fontWeight: 700,
                      letterSpacing: "0.35em",
                      minHeight: "3.5rem",
                    },
                  }}
                />

                {previewPremium ? (
                  <Text size="xs" fw={600} tt="uppercase" c="orange">
                    Premium · live transit
                  </Text>
                ) : null}
                {lookupLoading ? (
                  <Text size="sm" c="dimmed">
                    Checking session…
                  </Text>
                ) : null}

                <div>
                  <Text size="sm" fw={500} mb={6}>
                    Your side
                  </Text>
                  <SegmentedControl
                    fullWidth
                    data={JOIN_ROLE_OPTIONS}
                    value={playerRole}
                    disabled={formBusy}
                    onChange={(value) => {
                      const role = value as PlayerRole;
                      track(ANALYTICS_EVENTS.role_selected, {
                        role,
                        surface: "join",
                      });
                      form.setFieldValue("playerRole", role);
                      form.setFieldValue("rolePasscode", "");
                    }}
                    aria-label="Player side"
                  />
                </div>

                {needsRolePasscode ? (
                  <div>
                    <TextInput
                      id="join-session-role-code"
                      label="Role code"
                      {...rolePasscodeInputProps}
                      onChange={(event) =>
                        form.setFieldValue(
                          "rolePasscode",
                          normalizeRolePasscode(event.currentTarget.value),
                        )
                      }
                      maxLength={4}
                      placeholder="Team code"
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck={false}
                      styles={{
                        input: {
                          textAlign: "center",
                          fontFamily: "monospace",
                          fontSize: "1.25rem",
                          fontWeight: 700,
                          letterSpacing: "0.3em",
                        },
                      }}
                    />
                    <Text size="xs" c="dimmed" mt={6}>
                      {playerRole === "observer"
                        ? "Ask the host for the observer code."
                        : "Leave blank if you're first on that side; otherwise ask a teammate for the role code."}
                    </Text>
                  </div>
                ) : null}

                <Button
                  type="submit"
                  disabled={formBusy}
                  loading={joinBusy}
                >
                  {joinBusy ? "Joining…" : "Join session"}
                </Button>

                {canRequestAccess ? (
                  <Button
                    type="button"
                    variant="default"
                    onClick={() => void handleRequestAccess()}
                    disabled={formBusy}
                    loading={requestBusy}
                  >
                    {requestBusy ? "Requesting…" : "Request access"}
                  </Button>
                ) : null}

                {error ? (
                  <Alert color="red" title="Could not join">
                    {error}
                  </Alert>
                ) : null}
              </Stack>
            </form>
          )}
        </Stack>
      </Paper>
    </Container>
  );
}
