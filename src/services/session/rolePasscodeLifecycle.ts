import { httpsCallable } from "firebase/functions";
import { APP_VERSION } from "../../domain/device/changelog";
import type { JoinRequestRole } from "../../domain/session/players/joinRequest";
import type { PlayerRole } from "../../domain/session/players/playerRole";
import { getFirebaseFunctions, isFirebaseConfigured } from "../core/firebase/firebase";

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

  const functions = await getFirebaseFunctions();
  const callable = httpsCallable<typeof input, JoinSessionWithRoleResult>(
    functions,
    "joinSessionWithRole",
  );
  const result = await callable(input);
  return result.data;
}

export async function initSessionRoleGates(
  sessionId: string,
): Promise<InitSessionRoleGatesResult> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured.");
  }

  const functions = await getFirebaseFunctions();
  const callable = httpsCallable<{ sessionId: string }, InitSessionRoleGatesResult>(
    functions,
    "initSessionRoleGates",
  );
  const result = await callable({ sessionId });
  return result.data;
}

export async function leaveSessionMembership(sessionId: string): Promise<void> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured.");
  }

  const functions = await getFirebaseFunctions();
  const callable = httpsCallable<{ sessionId: string }, { ok: boolean }>(
    functions,
    "leaveSessionMembership",
  );
  await callable({ sessionId });
}

export async function revealRolePasscode(
  sessionId: string,
  role: "seeker" | "hider" | "observer",
): Promise<RolePasscodeActionResult> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured.");
  }

  const functions = await getFirebaseFunctions();
  const callable = httpsCallable<
    { sessionId: string; role: typeof role },
    RolePasscodeActionResult
  >(functions, "revealRolePasscode");
  const result = await callable({ sessionId, role });
  return result.data;
}

export async function regenerateRolePasscode(
  sessionId: string,
  role: "seeker" | "hider" | "observer",
): Promise<RolePasscodeActionResult> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured.");
  }

  const functions = await getFirebaseFunctions();
  const callable = httpsCallable<
    { sessionId: string; role: typeof role },
    RolePasscodeActionResult
  >(functions, "regenerateRolePasscode");
  const result = await callable({ sessionId, role });
  return result.data;
}

export async function requestRoleJoin(
  sessionId: string,
  role: JoinRequestRole,
): Promise<RequestRoleJoinResult> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured.");
  }

  const functions = await getFirebaseFunctions();
  const callable = httpsCallable<
    { sessionId: string; role: JoinRequestRole; clientVersion: string },
    RequestRoleJoinResult
  >(functions, "requestRoleJoin");
  const result = await callable({
    sessionId,
    role,
    clientVersion: APP_VERSION,
  });
  return result.data;
}

export async function cancelRoleJoinRequest(
  sessionId: string,
  requestId: string,
): Promise<void> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured.");
  }

  const functions = await getFirebaseFunctions();
  const callable = httpsCallable<
    { sessionId: string; requestId: string },
    { ok: boolean }
  >(functions, "cancelRoleJoinRequest");
  await callable({ sessionId, requestId });
}

export async function resolveRoleJoinRequest(
  sessionId: string,
  requestId: string,
  decision: ResolveRoleJoinDecision,
): Promise<void> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured.");
  }

  const functions = await getFirebaseFunctions();
  const callable = httpsCallable<
    {
      sessionId: string;
      requestId: string;
      decision: ResolveRoleJoinDecision;
    },
    { ok: boolean }
  >(functions, "resolveRoleJoinRequest");
  await callable({ sessionId, requestId, decision });
}

export function mapRolePasscodeJoinError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Couldn't join the session.";
  }

  const message = error.message;
  if (message.includes("Wrong role code")) {
    return "Wrong role code. Ask your team for the current code.";
  }
  if (message.includes("Role code is required")) {
    return "Enter the role code for that side.";
  }
  if (message.includes("App version incompatible")) {
    return "Update the app to join this session.";
  }

  return message || "Couldn't join the session.";
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

  return message || "Couldn't send join request.";
}
