import { httpsCallable } from "firebase/functions";
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
