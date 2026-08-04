import { FirebaseError } from "firebase/app";
import {
  arrayUnion,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type DocumentData,
  type DocumentReference,
  type DocumentSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import type {
  GameArea,
  SessionRecord,
  SessionTier,
} from "../../../domain/map/annotations";
import { hidingZoneRadiusMeters, type GameSize } from "../../../domain/session/size/gameSize";
import type { SessionRulesPatch } from "../../../domain/session/tools/advancedSessionSettings";
import {
  resolvePlayerRole,
  type PlayerRole,
} from "../../../domain/session/players/playerRole";
import { timerStateToRemote, type TimerState } from "../../../domain/session/timer/timer";
import {
  sessionVersionCompatible,
  sessionVersionMismatchMessage,
} from "../../../domain/session/meta/sessionVersion";
import { APP_VERSION } from "../../../domain/device/changelog";
import { clientEnvUsesFirebaseEmulator } from "../../../config/env";
import { getFirestoreDb } from "../../core/firebase/firebase";
import { forceRefreshIdToken } from "../../core/auth/forceRefreshIdToken";
import { reportJoinPermissionDenied } from "../../core/analytics/sentry";
import {
  buildSessionDocument,
  deserializeSessionFromFirestore,
  parseEndGameTruthAnchors,
  sessionRulesPatchToFirestore,
} from "../serialization/serializeSession";
import { buildJoinPreviewSession } from "../../../domain/session/join/joinPreviewSession";
import { photoUploadAccessError } from "../../../domain/questions";
import { generateSessionCode } from "../../session/sessionCodes";
import {
  cancelOpenPendingQuestions,
  cancelWalkingThermometersAfterIdentityHeal,
  postGameSystemMessage,
} from "../firestoreSessionExtras";
import { emitGameEndedActivity } from "../../session/emitSessionActivity";
import {
  buildMemberUidsAfterHeal,
  buildMembershipHealState,
  sanitizeReturningMemberUid,
} from "../../../domain/session/players/returningMember";
import { isSessionRoleGated, buildRoleGatesForHost } from "../../../domain/session/players/roleGates";
import { repairGhostHost } from "../../session/sessionLifecycle";
import { initSessionRoleGates } from "../../session/rolePasscodeLifecycle";
import { joinGatedRemoteSessionByCode } from "../joinGatedRemoteSession";

export const HIDER_ROLE_POLL_MS = 250;
export const HIDER_ROLE_POLL_MAX_MS = 3000;
export const FIRESTORE_BATCH_LIMIT = 500;

export function sessionsCollection() {
  return collection(getFirestoreDb(), "sessions");
}

export function endGameTruthAnchorsDoc(sessionId: string) {
  return doc(getFirestoreDb(), "sessions", sessionId, "endGameTruth", "anchors");
}

export async function clearEndGameTruthAnchorsDoc(sessionId: string): Promise<void> {
  try {
    await deleteDoc(endGameTruthAnchorsDoc(sessionId));
  } catch (error) {
    if (
      error instanceof FirebaseError &&
      (error.code === "not-found" || error.code === "firestore/not-found")
    ) {
      return;
    }
    throw error;
  }
}
export function sessionCodeDoc(code: string) {
  return doc(getFirestoreDb(), "sessionCodes", code);
}

/**
 * Best-effort rollback when role-gate init fails after session docs land.
 * Host can end + delete the code; hard session delete is rules-denied.
 */
export async function rollbackCreatedRemoteSession(
  sessionId: string,
  code: string,
): Promise<void> {
  try {
    await updateDoc(doc(sessionsCollection(), sessionId), {
      endedAt: new Date().toISOString(),
      status: "ended",
      code: deleteField(),
    });
  } catch {
    // Prefer ending over leaving an active session without secrets.
  }
  try {
    await deleteDoc(sessionCodeDoc(code));
  } catch {
    // Code reclaim still works once the session is ended.
  }
}

/** True when a sessionCodes doc may be deleted and the code reused. */
export function isReclaimableSessionForCode(
  sessionData: Record<string, unknown> | null | undefined,
): boolean {
  if (sessionData == null) {
    return true;
  }

  return (
    sessionData.status === "ended" || typeof sessionData.endedAt === "string"
  );
}
export function annotationsCollection(sessionId: string) {
  return collection(getFirestoreDb(), "sessions", sessionId, "annotations");
}
export function isFirestorePermissionDenied(error: unknown): boolean {
  return error instanceof FirebaseError && error.code === "permission-denied";
}

export const JOIN_AUTH_FAILURE_MESSAGE =
  "Couldn't authenticate with the server. Try again. If it keeps failing, sign out and back in.";

export async function withJoinPermissionRetry<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (!isFirestorePermissionDenied(error)) {
      throw error;
    }

    reportJoinPermissionDenied("initial");
    try {
      await forceRefreshIdToken();
      return await operation();
    } catch (retryError) {
      if (isFirestorePermissionDenied(retryError)) {
        reportJoinPermissionDenied("retry");
        throw new Error(JOIN_AUTH_FAILURE_MESSAGE, { cause: retryError });
      }
      throw retryError;
    }
  }
}

type SessionMembershipPatch = {
  memberUids?: string[];
  memberRoles?: Record<string, PlayerRole>;
  memberAppVersions?: Record<string, string>;
};

export function readSessionMembershipFields(data: Record<string, unknown>): {
  memberUids: string[];
  memberRoles: Record<string, PlayerRole>;
  memberAppVersions: Record<string, string>;
  hostUid: string;
} {
  const memberUids = Array.isArray(data.memberUids)
    ? data.memberUids.filter(
        (memberUid): memberUid is string => typeof memberUid === "string",
      )
    : [];
  const memberRoles =
    data.memberRoles && typeof data.memberRoles === "object"
      ? (data.memberRoles as Record<string, PlayerRole>)
      : {};
  const memberAppVersions =
    data.memberAppVersions && typeof data.memberAppVersions === "object"
      ? (data.memberAppVersions as Record<string, string>)
      : {};
  const hostUid = typeof data.hostUid === "string" ? data.hostUid : "";
  return { memberUids, memberRoles, memberAppVersions, hostUid };
}

export function membershipPatchFromHealState(
  heal: ReturnType<typeof buildMembershipHealState>,
): SessionMembershipPatch {
  return {
    memberUids: heal.memberUids,
    memberRoles: heal.memberRoles,
    memberAppVersions: heal.memberAppVersions,
  };
}

export async function writeSessionMembershipPatch(
  sessionRef: DocumentReference,
  patch: SessionMembershipPatch,
): Promise<void> {
  try {
    await updateDoc(sessionRef, patch);
  } catch (error) {
    if (!isFirestorePermissionDenied(error) || !patch.memberAppVersions) {
      throw error;
    }

    const legacyPatch: Omit<SessionMembershipPatch, "memberAppVersions"> = {};
    if (patch.memberUids !== undefined) {
      legacyPatch.memberUids = patch.memberUids;
    }
    if (patch.memberRoles !== undefined) {
      legacyPatch.memberRoles = patch.memberRoles;
    }
    await updateDoc(sessionRef, legacyPatch);
  }
}

export async function applyReturningMemberHealWrite(
  sessionRef: DocumentReference,
  sessionId: string,
  data: Record<string, unknown>,
  uid: string,
  role: PlayerRole,
  clientVersion: string,
  returningMemberUid: string,
  fallbackHostUid?: string,
): Promise<ReturnType<typeof buildMembershipHealState>> {
  const fields = readSessionMembershipFields(data);
  const heal = buildMembershipHealState({
    existingMemberUids: fields.memberUids,
    existingRoles: fields.memberRoles,
    existingAppVersions: fields.memberAppVersions,
    uid,
    role,
    clientVersion,
    returningMemberUid,
    currentHostUid: fields.hostUid || fallbackHostUid || "",
  });
  await writeSessionMembershipPatch(
    sessionRef,
    membershipPatchFromHealState(heal),
  );
  void cancelWalkingThermometersAfterIdentityHeal(
    sessionId,
    returningMemberUid,
    uid,
    role,
  );

  // hostUid is Admin-only — repair ghost host after membership heal removes it.
  if (heal.nextHostUid != null) {
    try {
      const repaired = await repairGhostHost(sessionId);
      if (repaired.action === "repaired") {
        return { ...heal, hostUid: repaired.newHostUid, nextHostUid: repaired.newHostUid };
      }
    } catch {
      // Membership heal already landed; host repair can retry on next join.
    }
  }

  return heal;
}

