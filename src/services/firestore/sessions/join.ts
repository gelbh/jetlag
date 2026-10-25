import {
  arrayUnion,
  type DocumentData,
  type DocumentSnapshot,
  doc,
  getDoc,
  getDocFromServer,
  updateDoc,
} from "firebase/firestore";
import { APP_VERSION } from "@/domain/device/changelog";
import type { SessionRecord, SessionTier } from "@/domain/map/annotations";
import { photoUploadAccessError } from "@/domain/questions";
import { buildJoinPreviewSession } from "@/domain/session/join/joinPreviewSession";
import {
  sessionVersionCompatible,
  sessionVersionMismatchMessage,
} from "@/domain/session/meta/sessionVersion";
import type { PlayerRole } from "@/domain/session/players/playerRole";
import {
  buildMembershipHealState,
  buildMemberUidsAfterHeal,
  sanitizeReturningMemberUid,
} from "@/domain/session/players/returningMember";
import { isSessionRoleGated } from "@/domain/session/players/roleGates";
import {
  JOIN_ERROR_APP_VERSION_INCOMPATIBLE,
  JOIN_ERROR_LEGACY_JOIN,
  JOIN_ERROR_SESSION_ENDED,
  JOIN_ERROR_SESSION_NOT_FOUND,
} from "@/services/session/rolePasscodeLifecycle";
import { cancelWalkingThermometersAfterIdentityHeal } from "../firestoreSessionExtras";
import { joinGatedRemoteSessionByCode } from "../joinGatedRemoteSession";
import { ensureMemberProof } from "../memberProofs";
import { deserializeSessionFromFirestore } from "../serialization/serializeSession";
import { ensureRemoteSessionMembership } from "./membership";
import {
  HIDER_ROLE_POLL_MAX_MS,
  HIDER_ROLE_POLL_MS,
  isFirestorePermissionDenied,
  membershipPatchFromHealState,
  readSessionMembershipFields,
  sessionCodeDoc,
  sessionsCollection,
  touchSessionLastActive,
  withJoinPermissionRetry,
  writeSessionMembershipPatch,
} from "./shared";

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

type JoinRemoteSessionOptions = {
  returningMemberUid?: string;
  persistedMyUid?: string | null;
  rolePasscode?: string;
};

type SessionCodeRecord = {
  sessionId: string;
  hostUid: string;
  hostAppVersion?: string;
  tier?: SessionTier;
  status?: "active" | "ended";
  createdAt?: string;
};

function sanitizeJoinReturningMemberUid(options: JoinRemoteSessionOptions): string | undefined {
  return sanitizeReturningMemberUid(options.persistedMyUid, options.returningMemberUid);
}

async function readSessionCodeRecord(code: string): Promise<SessionCodeRecord | null> {
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
    hostAppVersion: typeof data.hostAppVersion === "string" ? data.hostAppVersion : undefined,
    tier: data.tier === "premium" ? "premium" : "free",
    status: data.status === "ended" ? "ended" : "active",
    createdAt: typeof data.createdAt === "string" ? data.createdAt : undefined,
  };
}

export function mapJoinFailureToError(
  result:
    | { status: "missing" }
    | { status: "ended" }
    | { status: "incompatible"; hostVersion: string },
  missingMessage: string,
): Error {
  if (result.status === "incompatible") {
    return new Error(sessionVersionMismatchMessage(result.hostVersion, APP_VERSION));
  }

  if (result.status === "ended") {
    return new Error("That session has ended. Join or create a new one.");
  }

  return new Error(missingMessage);
}

export async function lookupRemoteSessionByCode(
  code: string,
): Promise<
  { status: "missing" } | { status: "ended" } | { status: "found"; session: SessionRecord }
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
  { status: "incompatible"; hostVersion: string } | { status: "joined"; session: SessionRecord }
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
    !sessionVersionCompatible(sessionForVersionCheck, clientVersion, uid, returningMemberUid, role)
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

  if (!existingMemberUids.includes(uid) || returningMemberUid != null) {
    await writeSessionMembershipPatch(sessionDoc.ref, membershipPatchFromHealState(heal));
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
      hostUid: heal.hostUid,
      memberUids: heal.memberUids,
      memberRoles: heal.memberRoles,
      memberAppVersions: heal.memberAppVersions,
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
  { status: "incompatible"; hostVersion: string } | { status: "joined"; session: SessionRecord }
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
  // react-doctor-disable-next-line react-doctor/firebase-client-owned-authz-field -- firestore.rules membershipJoinTouchesOnlySelf limits this ungated join to the caller's own memberUids, memberRoles, and memberAppVersions entries
  await updateDoc(sessionRef, {
    memberUids: arrayUnion(uid),
    [`memberRoles.${uid}`]: role,
    [`memberAppVersions.${uid}`]: clientVersion,
  });

  try {
    const sessionDoc = await getDocFromServer(sessionRef);
    if (sessionDoc.exists()) {
      return {
        status: "joined",
        session: deserializeSessionFromFirestore(
          sessionDoc.id,
          sessionDoc.data() as Record<string, unknown>,
        ),
      };
    }
  } catch {}

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
  uid: string,
  role: PlayerRole,
  clientVersion: string,
  options: JoinRemoteSessionOptions,
): Promise<JoinRemoteSessionResult> {
  return joinGatedRemoteSessionByCode({
    code,
    uid,
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

function isLegacyJoinError(error: unknown): boolean {
  return error instanceof Error && error.message === JOIN_ERROR_LEGACY_JOIN;
}

function healFailureFromCallableError(
  error: unknown,
  codeRecord: SessionCodeRecord,
  clientVersion: string,
): JoinRemoteSessionResult | null {
  if (!(error instanceof Error)) {
    return null;
  }
  if (error.message === JOIN_ERROR_SESSION_NOT_FOUND) {
    return { status: "missing" };
  }
  if (error.message === JOIN_ERROR_SESSION_ENDED) {
    return { status: "ended" };
  }
  if (error.message === JOIN_ERROR_APP_VERSION_INCOMPATIBLE) {
    return { status: "incompatible", hostVersion: codeRecord.hostAppVersion ?? clientVersion };
  }
  return null;
}

/** Resolves null when the callable says this is not a heal (old uid is not a member). */
async function healReturningMemberViaCallable(
  code: string,
  codeRecord: SessionCodeRecord,
  uid: string,
  role: PlayerRole,
  clientVersion: string,
  returningMemberUid: string,
  options: JoinRemoteSessionOptions,
): Promise<JoinRemoteSessionResult | null> {
  let healed: JoinRemoteSessionResult;
  try {
    healed = await callJoinGatedRemoteSession(code, codeRecord, uid, role, clientVersion, {
      ...options,
      returningMemberUid,
      rolePasscode: options.rolePasscode,
    });
  } catch (error) {
    if (isLegacyJoinError(error)) {
      return null;
    }
    const failure = healFailureFromCallableError(error, codeRecord, clientVersion);
    if (failure) {
      return failure;
    }
    throw error;
  }

  if (healed.status === "joined") {
    void cancelWalkingThermometersAfterIdentityHeal(
      codeRecord.sessionId,
      returningMemberUid,
      uid,
      role,
    );
  }
  return healed;
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
  if (returningMemberUid != null && returningMemberUid !== uid) {
    const healed = await healReturningMemberViaCallable(
      code,
      codeRecord,
      uid,
      role,
      clientVersion,
      returningMemberUid,
      options,
    );
    if (healed) {
      return healed;
    }
    return joinRemoteSessionByCodeOnce(code, codeRecord, uid, role, clientVersion, undefined, {
      ...options,
      returningMemberUid: undefined,
    });
  }

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

      try {
        return await callJoinGatedRemoteSession(code, codeRecord, uid, role, clientVersion, {
          ...options,
          returningMemberUid,
          rolePasscode: options.rolePasscode,
        });
      } catch (gatedError) {
        if (isLegacyJoinError(gatedError)) {
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

  if (isSessionRoleGated(deserializeSessionFromFirestore(sessionDoc.id, data))) {
    return callJoinGatedRemoteSession(code, codeRecord, uid, role, clientVersion, {
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
  const result = await withJoinPermissionRetry(() =>
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

  if (result.status === "joined") {
    // Ungated joins write membership client-side, so the proof is created here.
    // Gated joins and heals got theirs from the callable; this is then one read.
    // Not awaited: setDoc resolves only on server ack and must not stall the join.
    void ensureMemberProof(codeRecord.sessionId, uid);
  }

  return result;
}

export async function getRemoteSessionById(sessionId: string): Promise<SessionRecord | null> {
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
  return session.memberUids.includes(uid) && session.memberRoles?.[uid] === "hider";
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
    if (error instanceof Error && error.message === "That session no longer exists.") {
      throw new Error("Syncing session… Try again in a moment.", { cause: error });
    }

    throw error;
  }

  if (!serverSessionGrantsHiderUpload(serverSession, uid)) {
    serverSession = (await waitForServerHiderRole(session.id, uid)) ?? serverSession;
  }

  const accessError = photoUploadAccessError(serverSession, uid);
  if (accessError) {
    throw new Error(accessError);
  }

  return serverSession;
}
