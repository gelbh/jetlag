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

import {
  sessionsCollection,
  endGameTruthAnchorsDoc,
  clearEndGameTruthAnchorsDoc,
  sessionCodeDoc,
  rollbackCreatedRemoteSession,
  annotationsCollection,
  withJoinPermissionRetry,
  readSessionMembershipFields,
  membershipPatchFromHealState,
  writeSessionMembershipPatch,
  applyReturningMemberHealWrite,
  sanitizeJoinReturningMemberUid,
  readSessionCodeRecord,
  mapJoinFailureToError,
  isReclaimableSessionForCode,
  isFirestorePermissionDenied,
  JOIN_AUTH_FAILURE_MESSAGE,
  HIDER_ROLE_POLL_MS,
  HIDER_ROLE_POLL_MAX_MS,
  FIRESTORE_BATCH_LIMIT,
} from "./shared";
import {
  ensureRemoteSessionMembership,
  type EnsureRemoteSessionMembershipOptions,
} from "./membership";

export type JoinRemoteSessionResult =
  | { status: "missing" }
  | { status: "ended" }
  | { status: "incompatible"; hostVersion: string }
  | {
      status: "joined";
      session: SessionRecord;
      rolePasscode?: string;
      becameLeader?: boolean;
    };
type SessionCodeRecord = {
  sessionId: string;
  hostUid: string;
  hostAppVersion?: string;
  tier?: SessionTier;
  status?: "active" | "ended";
  createdAt?: string;
};

function sanitizeJoinReturningMemberUid(
  options: JoinRemoteSessionOptions,
): string | undefined {
  return sanitizeReturningMemberUid(
    options.persistedMyUid,
    options.returningMemberUid,
  );
}

async function readSessionCodeRecord(
  code: string,
): Promise<SessionCodeRecord | null> {
  const codeDoc = await getDoc(sessionCodeDoc(code));
  if (!codeDoc.exists()) {
    return null;
  }

  const data = codeDoc.data();
  if (typeof data.sessionId !== "string" || typeof data.hostUid !== "string") {
    return null;
  }

  return {
    sessionId: data.sessionId,
    hostUid: data.hostUid,
    hostAppVersion:
      typeof data.hostAppVersion === "string" ? data.hostAppVersion : undefined,
    tier: data.tier === "premium" ? "premium" : "free",
    status: data.status === "ended" ? "ended" : "active",
    createdAt: typeof data.createdAt === "string" ? data.createdAt : undefined,
  };
}

function mapJoinFailureToError(
  result:
    | { status: "missing" }
    | { status: "ended" }
    | { status: "incompatible"; hostVersion: string },
  missingMessage: string,
): Error {
  if (result.status === "incompatible") {
    return new Error(
      sessionVersionMismatchMessage(result.hostVersion, APP_VERSION),
    );
  }

  if (result.status === "ended") {
    return new Error("That session has ended. Join or create a new one.");
  }

  return new Error(missingMessage);
}

export async function lookupRemoteSessionByCode(
  code: string,
): Promise<
  | { status: "missing" }
  | { status: "ended" }
  | { status: "found"; session: SessionRecord }
> {
  const codeRecord = await readSessionCodeRecord(code);
  if (!codeRecord) {
    return { status: "missing" };
  }

  if (codeRecord.status === "ended") {
    return { status: "ended" };
  }

  try {
    const sessionDoc = await getDoc(doc(sessionsCollection(), codeRecord.sessionId));
    if (!sessionDoc.exists()) {
      return { status: "missing" };
    }

    const data = sessionDoc.data() as Record<string, unknown>;

    if (typeof data.endedAt === "string") {
      return { status: "ended" };
    }

    return {
      status: "found",
      session: deserializeSessionFromFirestore(sessionDoc.id, data),
    };
  } catch (error) {
    if (!isFirestorePermissionDenied(error)) {
      throw error;
    }
  }

  return {
    status: "found",
    session: buildJoinPreviewSession(codeRecord.sessionId, code, codeRecord),
  };
}

async function joinRemoteSessionWithRead(
  sessionDoc: DocumentSnapshot<DocumentData>,
  uid: string,
  role: PlayerRole,
  clientVersion: string,
  returningMemberUid?: string,
): Promise<
  | { status: "incompatible"; hostVersion: string }
  | { status: "joined"; session: SessionRecord }
> {
  const data = sessionDoc.data() as Record<string, unknown>;
  const existing = readSessionMembershipFields(data);
  const existingMemberUids = existing.memberUids;
  const existingRoles = existing.memberRoles;
  const existingMemberAppVersions = existing.memberAppVersions;

  const sessionForVersionCheck = deserializeSessionFromFirestore(sessionDoc.id, data);
  const isReturningMember =
    existingMemberUids.includes(uid) ||
    (returningMemberUid != null && existingMemberUids.includes(returningMemberUid));
  if (
    !isReturningMember &&
    !sessionVersionCompatible(
      sessionForVersionCheck,
      clientVersion,
      uid,
      returningMemberUid,
      role,
    )
  ) {
    return {
      status: "incompatible",
      hostVersion: sessionForVersionCheck.hostAppVersion ?? clientVersion,
    };
  }

  const heal = buildMembershipHealState({
    existingMemberUids,
    existingRoles,
    existingAppVersions: existingMemberAppVersions,
    uid,
    role,
    clientVersion,
    returningMemberUid,
    currentHostUid: existing.hostUid,
  });
  const roleChanged = existingRoles[uid] !== role;

  let joinedHeal = heal;
  if (returningMemberUid != null && returningMemberUid !== uid) {
    joinedHeal = await applyReturningMemberHealWrite(
      sessionDoc.ref,
      sessionDoc.id,
      data,
      uid,
      role,
      clientVersion,
      returningMemberUid,
    );
  } else if (!existingMemberUids.includes(uid) || returningMemberUid != null) {
    await writeSessionMembershipPatch(
      sessionDoc.ref,
      membershipPatchFromHealState(heal),
    );
  } else if (!existingRoles[uid] || roleChanged) {
    await writeSessionMembershipPatch(sessionDoc.ref, {
      memberRoles: heal.memberRoles,
      memberAppVersions: heal.memberAppVersions,
    });
  } else if (existingMemberAppVersions[uid] !== clientVersion) {
    await writeSessionMembershipPatch(sessionDoc.ref, {
      memberAppVersions: heal.memberAppVersions,
    });
  }

  return {
    status: "joined",
    session: deserializeSessionFromFirestore(sessionDoc.id, {
      ...data,
      hostUid: joinedHeal.hostUid,
      memberUids: joinedHeal.memberUids,
      memberRoles: joinedHeal.memberRoles,
      memberAppVersions: joinedHeal.memberAppVersions,
    }),
  };
}

async function joinRemoteSessionWithoutRead(
  sessionId: string,
  codeRecord: SessionCodeRecord,
  uid: string,
  role: PlayerRole,
  clientVersion: string,
  returningMemberUid?: string,
): Promise<
  | { status: "incompatible"; hostVersion: string }
  | { status: "joined"; session: SessionRecord }
> {
  const previewSession = buildJoinPreviewSession(sessionId, "", codeRecord);
  if (
    !returningMemberUid &&
    !sessionVersionCompatible(previewSession, clientVersion, uid, undefined, role)
  ) {
    return {
      status: "incompatible",
      hostVersion: previewSession.hostAppVersion ?? clientVersion,
    };
  }

  const sessionRef = doc(sessionsCollection(), sessionId);
  await updateDoc(sessionRef, {
    memberUids: arrayUnion(uid),
    [`memberRoles.${uid}`]: role,
    [`memberAppVersions.${uid}`]: clientVersion,
  });

  if (returningMemberUid != null && returningMemberUid !== uid) {
    try {
      const joinedDoc = await getDocFromServer(sessionRef);
      if (joinedDoc.exists()) {
        const joinedData = joinedDoc.data() as Record<string, unknown>;
        const heal = await applyReturningMemberHealWrite(
          sessionRef,
          sessionId,
          joinedData,
          uid,
          role,
          clientVersion,
          returningMemberUid,
          codeRecord.hostUid,
        );
        return {
          status: "joined",
          session: deserializeSessionFromFirestore(sessionId, {
            ...joinedData,
            hostUid: heal.hostUid,
            memberUids: heal.memberUids,
            memberRoles: heal.memberRoles,
            memberAppVersions: heal.memberAppVersions,
          }),
        };
      }
    } catch {
      // Fall through to the preview fallback below; membership already landed.
    }
  }

  try {
    const sessionDoc = await getDocFromServer(sessionRef);
    if (sessionDoc.exists()) {
      return {
        status: "joined",
        session: deserializeSessionFromFirestore(sessionDoc.id, sessionDoc.data() as Record<string, unknown>),
      };
    }
  } catch {
    // Fall through to preview only as last resort.
  }

  const memberUids = returningMemberUid
    ? buildMemberUidsAfterHeal([returningMemberUid], uid, returningMemberUid)
    : [uid];

  return {
    status: "joined",
    session: {
      ...previewSession,
      id: sessionId,
      memberUids,
      memberRoles: { [uid]: role },
      memberAppVersions: { [uid]: clientVersion },
    },
  };
}

function callJoinGatedRemoteSession(
  code: string,
  codeRecord: SessionCodeRecord,
  role: PlayerRole,
  clientVersion: string,
  options: JoinRemoteSessionOptions,
): Promise<JoinRemoteSessionResult> {
  return joinGatedRemoteSessionByCode({
    code,
    codeRecord,
    role,
    clientVersion,
    rolePasscode: options.rolePasscode,
    returningMemberUid: options.returningMemberUid,
    persistedMyUid: options.persistedMyUid,
    lookupRemoteSessionByCode,
    touchSessionLastActive: (sessionId) => {
      void touchSessionLastActive(sessionId);
    },
  });
}

async function joinRemoteSessionByCodeOnce(
  code: string,
  codeRecord: SessionCodeRecord,
  uid: string,
  role: PlayerRole,
  clientVersion: string,
  returningMemberUid: string | undefined,
  options: JoinRemoteSessionOptions = {},
): Promise<JoinRemoteSessionResult> {
  let sessionDoc: Awaited<ReturnType<typeof getDoc>>;
  try {
    sessionDoc = await getDoc(doc(sessionsCollection(), codeRecord.sessionId));
  } catch (error) {
    if (!isFirestorePermissionDenied(error)) {
      throw error;
    }

    try {
      const joinedWithoutRead = await joinRemoteSessionWithoutRead(
        codeRecord.sessionId,
        codeRecord,
        uid,
        role,
        clientVersion,
        returningMemberUid,
      );
      if (joinedWithoutRead.status === "joined") {
        void touchSessionLastActive(codeRecord.sessionId);
        return {
          status: "joined",
          session: {
            ...joinedWithoutRead.session,
            code,
          },
        };
      }
      return joinedWithoutRead;
    } catch (legacyJoinError) {
      if (!isFirestorePermissionDenied(legacyJoinError)) {
        throw legacyJoinError;
      }

      // Gated sessions deny client membership writes. Probe the callable;
      // if the session is not gated, keep the permission-denied for auth retry.
      try {
        return await callJoinGatedRemoteSession(code, codeRecord, role, clientVersion, {
          ...options,
          returningMemberUid,
          rolePasscode: options.rolePasscode,
        });
      } catch (gatedError) {
        if (
          gatedError instanceof Error &&
          gatedError.message.includes("legacy join")
        ) {
          throw legacyJoinError;
        }
        throw gatedError;
      }
    }
  }

  if (!sessionDoc.exists()) {
    return { status: "missing" };
  }

  const data = sessionDoc.data() as Record<string, unknown>;
  if (typeof data.endedAt === "string") {
    return { status: "ended" };
  }

  if (
    isSessionRoleGated(
      deserializeSessionFromFirestore(sessionDoc.id, data),
    )
  ) {
    return callJoinGatedRemoteSession(code, codeRecord, role, clientVersion, {
      ...options,
      returningMemberUid,
      rolePasscode: options.rolePasscode,
    });
  }

  try {
    const joined = await joinRemoteSessionWithRead(
      sessionDoc as DocumentSnapshot<DocumentData>,
      uid,
      role,
      clientVersion,
      returningMemberUid,
    );
    if (joined.status === "joined") {
      void touchSessionLastActive(sessionDoc.id);
      return {
        status: "joined",
        session: {
          ...joined.session,
          code,
        },
      };
    }
    return joined;
  } catch (error) {
    if (!isFirestorePermissionDenied(error)) {
      throw error;
    }
  }

  const joinedWithoutRead = await joinRemoteSessionWithoutRead(
    codeRecord.sessionId,
    codeRecord,
    uid,
    role,
    clientVersion,
    returningMemberUid,
  );
  if (joinedWithoutRead.status === "joined") {
    return {
      status: "joined",
      session: {
        ...joinedWithoutRead.session,
        code,
      },
    };
  }
  return joinedWithoutRead;
}

export async function joinRemoteSessionByCode(
  code: string,
  uid: string,
  role: PlayerRole = "seeker",
  clientVersion: string = APP_VERSION,
  options: JoinRemoteSessionOptions = {},
): Promise<JoinRemoteSessionResult> {
  const codeRecord = await readSessionCodeRecord(code);
  if (!codeRecord) {
    return { status: "missing" };
  }

  if (codeRecord.status === "ended") {
    return { status: "ended" };
  }

  const returningMemberUid = sanitizeJoinReturningMemberUid(options);
  return withJoinPermissionRetry(() =>
    joinRemoteSessionByCodeOnce(
      code,
      codeRecord,
      uid,
      role,
      clientVersion,
      returningMemberUid,
      options,
    ),
  );
}

export async function getRemoteSessionById(
  sessionId: string,
): Promise<SessionRecord | null> {
  const sessionRef = doc(sessionsCollection(), sessionId);
  const snapshot = await getDoc(sessionRef);

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data() as Record<string, unknown>;

  return deserializeSessionFromFirestore(snapshot.id, data);
}

export async function getRemoteSessionByIdFromServer(
  sessionId: string,
): Promise<SessionRecord | null> {
  const sessionRef = doc(sessionsCollection(), sessionId);
  const snapshot = await getDocFromServer(sessionRef);

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data() as Record<string, unknown>;

  return deserializeSessionFromFirestore(snapshot.id, data);
}

function serverSessionGrantsHiderUpload(
  session: Pick<SessionRecord, "memberUids" | "memberRoles">,
  uid: string,
): boolean {
  return (
    session.memberUids.includes(uid) &&
    session.memberRoles?.[uid] === "hider"
  );
}

export async function waitForServerHiderRole(
  sessionId: string,
  uid: string,
  maxMs: number = HIDER_ROLE_POLL_MAX_MS,
): Promise<SessionRecord | null> {
  const deadline = Date.now() + maxMs;

  while (Date.now() < deadline) {
    const session = await getRemoteSessionByIdFromServer(sessionId);
    if (session && serverSessionGrantsHiderUpload(session, uid)) {
      return session;
    }

    await new Promise((resolve) => setTimeout(resolve, HIDER_ROLE_POLL_MS));
  }

  return getRemoteSessionByIdFromServer(sessionId);
}

export async function ensureHiderPhotoUploadAccess(
  session: Pick<SessionRecord, "id" | "code" | "memberUids" | "memberRoles">,
  uid: string,
  returningMemberUid?: string | null,
): Promise<SessionRecord> {
  let serverSession: SessionRecord;
  try {
    serverSession = await ensureRemoteSessionMembership(session, uid, "hider", {
      returningMemberUid,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "That session no longer exists."
    ) {
      throw new Error("Syncing session… Try again in a moment.", { cause: error });
    }

    throw error;
  }

  if (!serverSessionGrantsHiderUpload(serverSession, uid)) {
    serverSession =
      (await waitForServerHiderRole(session.id, uid)) ?? serverSession;
  }

  const accessError = photoUploadAccessError(serverSession, uid);
  if (accessError) {
    throw new Error(accessError);
  }

  return serverSession;
}

