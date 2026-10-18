import { APP_VERSION } from "../../domain/device/changelog";
import { JOIN_ERROR_MARKERS } from "../../domain/session/join/joinErrorMarkers";
import type { JoinRequestRole } from "../../domain/session/players/joinRequest";
import type { PlayerRole } from "../../domain/session/players/playerRole";
import { callWithResilience, isCallableError } from "../core/firebase/callWithResilience";
import { isFirebaseConfigured } from "../core/firebase/firebase";

export type JoinSessionWithRoleResult = {
  sessionId: string;
  rolePasscode?: string;
  becameLeader?: boolean;
};

export type InitSessionRoleGatesResult = {
  observerPasscode: string;
  rolePasscode?: string;
};

export type RolePasscodeActionResult = {
  role: "seeker" | "hider" | "observer";
  rolePasscode: string;
};

export type RequestRoleJoinResult = {
  requestId: string;
  expiresAt: string;
};

export type ResolveRoleJoinDecision = "accept" | "decline";

/** Create-path / write-heavy callables: cold starts can exceed the 12 s default. */
const SLOW_CALLABLE_TIMEOUT_MS = 25_000;

/** A retry after a committed-but-lost cancel/resolve sees the request already settled. */
function recoverJoinRequestNoLongerPending(error: unknown): { ok: boolean } | undefined {
  return isCallableError(error, "failed-precondition", "Join request is not pending.")
    ? { ok: true }
    : undefined;
}

export async function joinSessionWithRole(input: {
  code: string;
  role: PlayerRole;
  rolePasscode?: string;
  clientVersion: string;
  returningMemberUid?: string;
  persistedMyUid?: string;
}): Promise<JoinSessionWithRoleResult> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured.");
  }

  // Membership heal is set-like: a retry after a lost response converges.
  return callWithResilience<typeof input, JoinSessionWithRoleResult>("joinSessionWithRole", input, {
    idempotent: true,
  });
}

export async function initSessionRoleGates(sessionId: string): Promise<InitSessionRoleGatesResult> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured.");
  }

  // Create path: first callable after a cold start, so allow a longer wait.
  // A retry after a committed-but-lost first call sees "already initialized";
  // read the observer code back instead of failing (and rolling back) create.
  return callWithResilience<{ sessionId: string }, InitSessionRoleGatesResult>(
    "initSessionRoleGates",
    { sessionId },
    {
      idempotent: true,
      timeoutMs: SLOW_CALLABLE_TIMEOUT_MS,
      recoverAfterRetry: async (error) => {
        if (!isCallableError(error, "failed-precondition", "Role gates already initialized.")) {
          return undefined;
        }
        const observer = await revealRolePasscode(sessionId, "observer");
        return { observerPasscode: observer.rolePasscode };
      },
    },
  );
}

/**
 * Caller is no longer a member: the leave already happened, whether the first
 * attempt or a lost retry was rejected. Prefix match is deliberate: production
 * captures carry a " [403]" suffix on the message.
 */
function isAlreadyLeftError(error: unknown): boolean {
  return (
    isCallableError(error, "permission-denied") &&
    error.message.startsWith("Session membership required")
  );
}

export async function leaveSessionMembership(sessionId: string): Promise<"left" | "already_left"> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured.");
  }

  try {
    await callWithResilience<{ sessionId: string }, { ok: boolean }>(
      "leaveSessionMembership",
      { sessionId },
      { idempotent: true },
    );
    return "left";
  } catch (error) {
    if (!isAlreadyLeftError(error)) {
      throw error;
    }
    return "already_left";
  } finally {
    clearRolePasscodeRevealWarm(sessionId);
  }
}

type RevealRole = RolePasscodeActionResult["role"];

/** In-flight warm only — no durable secret memo (stale after remote rotate). */
const revealInflight = new Map<string, Promise<RolePasscodeActionResult>>();

function revealWarmKey(sessionId: string, role: RevealRole): string {
  return `${sessionId}:${role}`;
}

/** Drop in-flight warm slots (tests, leave, regenerate). */
export function clearRolePasscodeRevealWarm(sessionId?: string): void {
  if (!sessionId) {
    revealInflight.clear();
    return;
  }
  const prefix = `${sessionId}:`;
  for (const key of revealInflight.keys()) {
    if (key.startsWith(prefix)) {
      revealInflight.delete(key);
    }
  }
}

/**
 * Warm the reveal path without exposing the code in UI.
 * Coalesces with an in-flight reveal for the same session+role.
 */
export function prefetchRolePasscode(sessionId: string, role: RevealRole): void {
  void revealRolePasscode(sessionId, role).catch(() => {
    // Prefetch is best-effort; tap Reveal surfaces the error.
  });
}

export async function revealRolePasscode(
  sessionId: string,
  role: RevealRole,
): Promise<RolePasscodeActionResult> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured.");
  }

  const key = revealWarmKey(sessionId, role);
  const inflight = revealInflight.get(key);
  if (inflight) {
    return inflight;
  }

  const promise = callWithResilience<
    { sessionId: string; role: RevealRole },
    RolePasscodeActionResult
  >("revealRolePasscode", { sessionId, role }, { idempotent: true });

  revealInflight.set(key, promise);
  try {
    return await promise;
  } finally {
    if (revealInflight.get(key) === promise) {
      revealInflight.delete(key);
    }
  }
}

export async function regenerateRolePasscode(
  sessionId: string,
  role: RevealRole,
): Promise<RolePasscodeActionResult> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured.");
  }

  // Abandon any warm reveal so a late prefetch cannot win over the new code.
  revealInflight.delete(revealWarmKey(sessionId, role));

  // Not idempotent: every call mints a new secret.
  return callWithResilience<{ sessionId: string; role: RevealRole }, RolePasscodeActionResult>(
    "regenerateRolePasscode",
    { sessionId, role },
    { idempotent: false },
  );
}

export async function requestRoleJoin(
  sessionId: string,
  role: JoinRequestRole,
): Promise<RequestRoleJoinResult> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured.");
  }

  // Not idempotent: each call creates a new pending request doc. Longer wait so
  // a cold start does not surface an error for a request that was created.
  return callWithResilience<
    { sessionId: string; role: JoinRequestRole; clientVersion: string },
    RequestRoleJoinResult
  >(
    "requestRoleJoin",
    { sessionId, role, clientVersion: APP_VERSION },
    { idempotent: false, timeoutMs: SLOW_CALLABLE_TIMEOUT_MS },
  );
}

export async function cancelRoleJoinRequest(sessionId: string, requestId: string): Promise<void> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured.");
  }

  await callWithResilience<{ sessionId: string; requestId: string }, { ok: boolean }>(
    "cancelRoleJoinRequest",
    { sessionId, requestId },
    {
      idempotent: true,
      recoverAfterRetry: recoverJoinRequestNoLongerPending,
    },
  );
}

export async function resolveRoleJoinRequest(
  sessionId: string,
  requestId: string,
  decision: ResolveRoleJoinDecision,
): Promise<void> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured.");
  }

  await callWithResilience<
    {
      sessionId: string;
      requestId: string;
      decision: ResolveRoleJoinDecision;
    },
    { ok: boolean }
  >(
    "resolveRoleJoinRequest",
    { sessionId, requestId, decision },
    { idempotent: true, recoverAfterRetry: recoverJoinRequestNoLongerPending },
  );
}

const CLIENT_UPDATE_REQUIRED_COPY = "Update the app to continue. Refresh to load the latest build.";

export const ROLE_CODE_REQUIRED_COPY = "Enter the role code for that side.";

function isClientUpdateRequiredMessage(message: string): boolean {
  return message.includes(JOIN_ERROR_MARKERS.clientUpdateRequired);
}

/**
 * Copy `mapRolePasscodeJoinError` returns for join outcomes that callers branch
 * on. Compare a mapped message against these, never against literal copy.
 */
export const JOIN_ERROR_SESSION_NOT_FOUND = "Session not found.";
export const JOIN_ERROR_SESSION_ENDED = "Session already ended.";
export const JOIN_ERROR_APP_VERSION_INCOMPATIBLE = "Update the app to join this session.";
export const JOIN_ERROR_LEGACY_JOIN = "Session uses legacy join.";
export const JOIN_ERROR_HEAL_ROLE_MISMATCH =
  "Rejoin with the role you had before, or ask the host for help.";

export function mapRolePasscodeJoinError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Couldn't join the session.";
  }

  // not-found is unique to a missing session; failed-precondition is shared, so
  // those cases also need the server message.
  if (isCallableError(error, "not-found")) {
    return JOIN_ERROR_SESSION_NOT_FOUND;
  }
  const message = error.message;
  if (message.includes(JOIN_ERROR_MARKERS.sessionEnded)) {
    return JOIN_ERROR_SESSION_ENDED;
  }
  if (message.includes(JOIN_ERROR_MARKERS.legacyJoin)) {
    return JOIN_ERROR_LEGACY_JOIN;
  }
  if (message.includes(JOIN_ERROR_MARKERS.healRoleMismatch)) {
    return JOIN_ERROR_HEAL_ROLE_MISMATCH;
  }
  if (message.includes(JOIN_ERROR_MARKERS.wrongRoleCode)) {
    return "Wrong role code. Ask your team for the current code.";
  }
  if (message.includes(JOIN_ERROR_MARKERS.roleCodeRequired)) {
    return ROLE_CODE_REQUIRED_COPY;
  }
  if (message.includes(JOIN_ERROR_MARKERS.versionIncompatible)) {
    return JOIN_ERROR_APP_VERSION_INCOMPATIBLE;
  }
  if (isClientUpdateRequiredMessage(message)) {
    return CLIENT_UPDATE_REQUIRED_COPY;
  }

  return message || "Couldn't join the session.";
}

/** Leader-facing copy when accept/decline of a pending request fails. */
export function mapLeaderJoinResolveError(error: unknown): string {
  if (error instanceof Error && isClientUpdateRequiredMessage(error.message)) {
    return "That player needs to update the app before they can join.";
  }
  return mapJoinRequestError(error);
}

export function mapJoinRequestError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Couldn't send join request.";
  }

  const message = error.message;
  if (message.includes("this side is empty")) {
    return "This side is empty — join without a role code instead.";
  }
  if (message.includes("Session already ended")) {
    return "That session has ended. Ask the host for a new code.";
  }
  if (message.includes("Session not found")) {
    return "No session found for that code.";
  }
  if (message.includes("legacy join")) {
    return "This session doesn't support join requests.";
  }
  if (isClientUpdateRequiredMessage(message)) {
    return CLIENT_UPDATE_REQUIRED_COPY;
  }

  return message || "Couldn't send join request.";
}
