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
} from "../../domain/map/annotations";
import { hidingZoneRadiusMeters, type GameSize } from "../../domain/session/size/gameSize";
import type { SessionRulesPatch } from "../../domain/session/tools/advancedSessionSettings";
import {
  resolvePlayerRole,
  type PlayerRole,
} from "../../domain/session/players/playerRole";
import { timerStateToRemote, type TimerState } from "../../domain/session/timer/timer";
import {
  sessionVersionCompatible,
  sessionVersionMismatchMessage,
} from "../../domain/session/meta/sessionVersion";
import { APP_VERSION } from "../../domain/device/changelog";
import { clientEnvUsesFirebaseEmulator } from "../../config/env";
import { getFirestoreDb } from "../core/firebase/firebase";
import { forceRefreshIdToken } from "../core/auth/forceRefreshIdToken";
import { reportJoinPermissionDenied } from "../core/analytics/sentry";
import {
  buildSessionDocument,
  deserializeSessionFromFirestore,
  parseEndGameTruthAnchors,
  sessionRulesPatchToFirestore,
} from "./serialization/serializeSession";
import { buildJoinPreviewSession } from "../../domain/session/join/joinPreviewSession";
import { photoUploadAccessError } from "../../domain/questions";
import { generateSessionCode } from "../session/sessionCodes";
import {
  cancelOpenPendingQuestions,
  cancelWalkingThermometersAfterIdentityHeal,
  postGameSystemMessage,
} from "./firestoreSessionExtras";
import { emitGameEndedActivity } from "../session/emitSessionActivity";
import {
  buildMemberUidsAfterHeal,
  buildMembershipHealState,
  sanitizeReturningMemberUid,
} from "../../domain/session/players/returningMember";
import { isSessionRoleGated, buildRoleGatesForHost } from "../../domain/session/players/roleGates";
import { repairGhostHost } from "../session/sessionLifecycle";
import { initSessionRoleGates } from "../session/rolePasscodeLifecycle";
import { joinGatedRemoteSessionByCode } from "./joinGatedRemoteSession";

const HIDER_ROLE_POLL_MS = 250;
const HIDER_ROLE_POLL_MAX_MS = 3000;
const FIRESTORE_BATCH_LIMIT = 500;

function sessionsCollection() {
  return collection(getFirestoreDb(), "sessions");
}

function endGameTruthAnchorsDoc(sessionId: string) {
  return doc(getFirestoreDb(), "sessions", sessionId, "endGameTruth", "anchors");
}

async function clearEndGameTruthAnchorsDoc(sessionId: string): Promise<void> {
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
function sessionCodeDoc(code: string) {
  return doc(getFirestoreDb(), "sessionCodes", code);
}

/**
 * Best-effort rollback when role-gate init fails after session docs land.
 * Host can end + delete the code; hard session delete is rules-denied.
 */
async function rollbackCreatedRemoteSession(
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
function annotationsCollection(sessionId: string) {
  return collection(getFirestoreDb(), "sessions", sessionId, "annotations");
}
export function isFirestorePermissionDenied(error: unknown): boolean {
  return error instanceof FirebaseError && error.code === "permission-denied";
}

export const JOIN_AUTH_FAILURE_MESSAGE =
  "Couldn't authenticate with the server. Try again. If it keeps failing, sign out and back in.";

async function withJoinPermissionRetry<T>(operation: () => Promise<T>): Promise<T> {
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

function readSessionMembershipFields(data: Record<string, unknown>): {
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

function membershipPatchFromHealState(
  heal: ReturnType<typeof buildMembershipHealState>,
): SessionMembershipPatch {
  return {
    memberUids: heal.memberUids,
    memberRoles: heal.memberRoles,
    memberAppVersions: heal.memberAppVersions,
  };
}

async function writeSessionMembershipPatch(
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

async function applyReturningMemberHealWrite(
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

export type EnsureRemoteSessionMembershipOptions = {
  returningMemberUid?: string | null;
  persistedMyUid?: string | null;
};
type JoinRemoteSessionOptions = {
  returningMemberUid?: string;
  persistedMyUid?: string | null;
  rolePasscode?: string;
};
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

export async function ensureRemoteSessionMembership(
  session: Pick<SessionRecord, "id" | "code" | "memberUids" | "memberRoles">,
  uid: string,
  role: PlayerRole,
  options?: EnsureRemoteSessionMembershipOptions,
): Promise<SessionRecord> {
  let serverSession: SessionRecord | null = null;
  try {
    serverSession = await getRemoteSessionByIdFromServer(session.id);
  } catch (error) {
    if (!isFirestorePermissionDenied(error)) {
      throw error;
    }
  }

  if (!serverSession) {
    const lookup = await lookupRemoteSessionByCode(session.code);
    if (lookup.status === "missing") {
      throw new Error("That session no longer exists.");
    }
    if (lookup.status === "ended") {
      throw new Error("That session has ended. Join or create a new one.");
    }
    serverSession = lookup.session;
  }

  if (serverSession.endedAt) {
    throw new Error("That session has ended. Join or create a new one.");
  }

  if (serverSession.memberUids.includes(uid)) {
    return serverSession;
  }

  const result = await joinRemoteSessionByCode(serverSession.code, uid, role, APP_VERSION, {
    returningMemberUid: options?.returningMemberUid ?? undefined,
    persistedMyUid: options?.persistedMyUid ?? options?.returningMemberUid ?? undefined,
  });

  if (result.status === "joined") {
    return result.session;
  }

  throw mapJoinFailureToError(
    result,
    "You are not a member of this session. Rejoin with the session code.",
  );
}

export async function ensureRemoteSessionWriteAccess(
  session: SessionRecord,
  uid: string,
  role: PlayerRole = resolvePlayerRole(session.memberRoles, uid),
  options?: EnsureRemoteSessionMembershipOptions,
): Promise<SessionRecord> {
  try {
    return await ensureRemoteSessionMembership(session, uid, role, options);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "That session no longer exists."
    ) {
      throw new Error("No access to that session.", { cause: error });
    }

    throw error;
  }
}

export async function createRemoteSession(
  gameArea: GameArea,
  hostUid: string,
  tier: SessionTier = "free",
  transitMetroId?: string,
  hostRole: PlayerRole = "seeker",
  gameSize: GameSize = "medium",
  rulesPatch: SessionRulesPatch = {},
  distanceUnit: SessionRecord["distanceUnit"] = "imperial",
  hostAppVersion: string = APP_VERSION,
): Promise<SessionRecord> {
  let code = generateSessionCode();
  let attempts = 0;

  while (attempts < 8) {
    const existing = await getDoc(sessionCodeDoc(code));
    if (!existing.exists()) {
      break;
    }

    try {
      // Rules allow delete only for host, missing session, or ended session.
      await deleteDoc(sessionCodeDoc(code));
      break;
    } catch {
      code = generateSessionCode();
      attempts += 1;
    }
  }

  const sessionRef = doc(sessionsCollection());
  const createdAt = new Date().toISOString();
  const radiusMeters =
    typeof rulesPatch.hidingZoneRadiusMeters === "number"
      ? rulesPatch.hidingZoneRadiusMeters
      : hidingZoneRadiusMeters(gameSize, distanceUnit ?? "imperial");
  const session: SessionRecord = {
    id: sessionRef.id,
    code,
    gameArea,
    hostUid,
    createdAt,
    memberUids: [hostUid],
    memberRoles: { [hostUid]: hostRole },
    gameSize,
    distanceUnit: distanceUnit ?? "imperial",
    hidingZoneRadiusMeters: radiusMeters,
    tier,
    transitMetroId,
    hostAppVersion,
    ...rulesPatch,
  };

  await setDoc(sessionRef, {
    ...buildSessionDocument(
      code,
      gameArea,
      hostUid,
      createdAt,
      tier,
      transitMetroId,
      hostRole,
      gameSize,
      rulesPatch,
      distanceUnit ?? "imperial",
      hostAppVersion,
    ),
    createdAtServer: serverTimestamp(),
  });

  await setDoc(sessionCodeDoc(code), {
    sessionId: sessionRef.id,
    hostUid,
    hostAppVersion,
    tier,
    status: "active",
    createdAt,
  });

  // CI e2e / local emulator run auth+firestore+storage only — no Functions.
  // Leave ungated (legacy join); design: sessions without roleGates stay open.
  if (clientEnvUsesFirebaseEmulator()) {
    return session;
  }

  // Stamp roleGates + secrets together via callable (do not gate without secrets).
  try {
    await initSessionRoleGates(sessionRef.id);
  } catch (error) {
    await rollbackCreatedRemoteSession(sessionRef.id, code);
    throw new Error(
      "Couldn't set up role codes for this session. Try creating again.",
      { cause: error },
    );
  }
  session.roleGates = buildRoleGatesForHost(hostUid, hostRole);

  return session;
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

export async function endRemoteSession(sessionId: string): Promise<void> {
  const session = await getRemoteSessionById(sessionId);
  await updateDoc(doc(sessionsCollection(), sessionId), {
    endedAt: new Date().toISOString(),
    status: "ended",
    code: deleteField(),
  });

  if (session?.code) {
    await deleteDoc(sessionCodeDoc(session.code));
  }
}

export async function updateSessionTimer(
  sessionId: string,
  state: TimerState,
): Promise<void> {
  const remote = timerStateToRemote(state);
  const patch =
    remote.timerRunningSince === null
      ? {
          timerAccumulatedMs: remote.timerAccumulatedMs,
          timerRunningSince: deleteField(),
        }
      : remote;

  await updateDoc(doc(sessionsCollection(), sessionId), patch);
}

export async function updateSessionRules(
  sessionId: string,
  patch: SessionRulesPatch,
): Promise<void> {
  await updateDoc(
    doc(sessionsCollection(), sessionId),
    sessionRulesPatchToFirestore(patch),
  );
}

/** Seeker/host direct End Game start (no hider Accept). Clears legacy request fields. */
export async function startEndGameSession(
  sessionId: string,
  startedByUid: string,
  anchors: Record<string, { lat: number; lng: number; frozenAt: string }>,
  endGameStartedAt: string = new Date().toISOString(),
): Promise<void> {
  // Anchors create first so session start rules can require the freeze doc.
  // Batch final-state evaluation still accepts both writes together.
  const batch = writeBatch(getFirestoreDb());
  batch.set(endGameTruthAnchorsDoc(sessionId), { anchors });
  batch.update(doc(sessionsCollection(), sessionId), {
    endGameStartedAt,
    endGameStartedByUid: startedByUid,
    // Strip any legacy session-doc anchors (coords belong in endGameTruth/anchors).
    endGameTruthAnchors: deleteField(),
    endGameRequestedAt: deleteField(),
    endGameRequestedByUid: deleteField(),
  });
  await batch.commit();
}

export async function touchSessionLastActive(sessionId: string): Promise<void> {
  await updateDoc(doc(sessionsCollection(), sessionId), {
    lastActiveAt: new Date().toISOString(),
  });
}

/** Clear a pending end-game request only (hider decline / seeker cancel). */
export async function clearEndGameRequestSession(
  sessionId: string,
): Promise<void> {
  await updateDoc(doc(sessionsCollection(), sessionId), {
    endGameRequestedAt: deleteField(),
    endGameRequestedByUid: deleteField(),
  });
}

/** Clear active or pending end game, including frozen truth anchors. */
export async function resetEndGameSession(sessionId: string): Promise<void> {
  await updateDoc(doc(sessionsCollection(), sessionId), {
    endGameStartedAt: deleteField(),
    endGameStartedByUid: deleteField(),
    endGameTruthAnchors: deleteField(),
    endGameRequestedAt: deleteField(),
    endGameRequestedByUid: deleteField(),
  });
  await clearEndGameTruthAnchorsDoc(sessionId);
}

export async function requestFoundHiderSession(
  sessionId: string,
  requestedByUid: string,
): Promise<void> {
  await updateDoc(doc(sessionsCollection(), sessionId), {
    foundRequestedAt: new Date().toISOString(),
    foundRequestedByUid: requestedByUid,
  });
}

export async function confirmFoundHiderSession(
  sessionId: string,
  confirmedByUid: string,
): Promise<void> {
  await updateDoc(doc(sessionsCollection(), sessionId), {
    foundConfirmedAt: new Date().toISOString(),
    foundConfirmedByUid: confirmedByUid,
    gameOutcome: "found",
    foundRequestedAt: deleteField(),
    foundRequestedByUid: deleteField(),
    endGameStartedAt: deleteField(),
    endGameStartedByUid: deleteField(),
    endGameTruthAnchors: deleteField(),
    endGameRequestedAt: deleteField(),
    endGameRequestedByUid: deleteField(),
  });
  // Session outcome already persisted — cleanup must not surface as confirm failure.
  try {
    await clearEndGameTruthAnchorsDoc(sessionId);
  } catch {
    // Best-effort; anchors may already be absent or rules-denied after end.
  }
  emitGameEndedActivity(
    sessionId,
    { outcome: "found", summary: "Hider found" },
    confirmedByUid,
  );
}

export async function resetFoundHiderSession(sessionId: string): Promise<void> {
  await updateDoc(doc(sessionsCollection(), sessionId), {
    foundRequestedAt: deleteField(),
    foundRequestedByUid: deleteField(),
  });
}

export async function resetRemoteSession(
  sessionId: string,
  hostUid: string,
  hostRole: PlayerRole,
): Promise<string> {
  const resetAt = new Date().toISOString();

  const snapshot = await getDocs(annotationsCollection(sessionId));
  const activeDocs = snapshot.docs.filter(
    (annotationDoc) => annotationDoc.data().status === "active",
  );

  for (let index = 0; index < activeDocs.length; index += FIRESTORE_BATCH_LIMIT) {
    const chunk = activeDocs.slice(index, index + FIRESTORE_BATCH_LIMIT);
    const batch = writeBatch(getFirestoreDb());

    for (const annotationDoc of chunk) {
      batch.update(annotationDoc.ref, {
        status: "deleted",
        updatedAt: resetAt,
      });
    }

    await batch.commit();
  }

  await cancelOpenPendingQuestions(sessionId);

  await updateDoc(doc(sessionsCollection(), sessionId), {
    sessionResetAt: resetAt,
    timerAccumulatedMs: 0,
    timerRunningSince: deleteField(),
    endGameStartedAt: deleteField(),
    endGameStartedByUid: deleteField(),
    endGameTruthAnchors: deleteField(),
    endGameRequestedAt: deleteField(),
    endGameRequestedByUid: deleteField(),
  });

  await clearEndGameTruthAnchorsDoc(sessionId);

  await postGameSystemMessage(
    sessionId,
    hostUid,
    hostRole,
    "Session reset by host",
    `reset-${resetAt}`,
  );

  return resetAt;
}

export function subscribeToSession(
  sessionId: string,
  onChange: (session: SessionRecord) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(sessionsCollection(), sessionId),
    (snapshot) => {
      if (!snapshot.exists()) {
        return;
      }

      onChange(
        deserializeSessionFromFirestore(
          snapshot.id,
          snapshot.data() as Record<string, unknown>,
        ),
      );
    },
    (error) => onError(error),
  );
}

/** Hider/observer/admin-only freeze points (not on the seeker-readable session doc). */
export function subscribeToEndGameTruthAnchors(
  sessionId: string,
  onChange: (
    anchors: SessionRecord["endGameTruthAnchors"] | undefined,
  ) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    endGameTruthAnchorsDoc(sessionId),
    (snapshot) => {
      if (!snapshot.exists()) {
        onChange(undefined);
        return;
      }

      onChange(parseEndGameTruthAnchors(snapshot.data()?.anchors));
    },
    (error) => onError(error),
  );
}

