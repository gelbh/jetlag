import { FirebaseError } from "firebase/app";
import {
  arrayRemove,
  arrayUnion,
  collection,
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
  AnnotationRecord,
  GameArea,
  SessionRecord,
  SessionTier,
} from "../../domain/map/annotations";
import type { GameSize } from "../../domain/session/gameSize";
import { hidingZoneRadiusMeters } from "../../domain/session/gameSize";
import type { SessionRulesPatch } from "../../domain/session/advancedSessionSettings";
import {
  resolvePlayerRole,
  type PlayerRole,
} from "../../domain/session/playerRole";
import { timerStateToRemote, type TimerState } from "../../domain/session/timer";
import {
  sessionVersionCompatible,
} from "../../domain/session/sessionVersion";
import { APP_VERSION } from "../../domain/device/changelog";
import { getFirestoreDb } from "../core/firebase";
import {
  buildAnnotationDocument,
  buildSessionDocument,
  deserializeAnnotationFromFirestore,
  deserializeSessionFromFirestore,
  sessionRulesPatchToFirestore,
} from "./firestoreSerialization";
import { photoUploadAccessError } from "../../domain/questions";
import { generateSessionCode } from "../session/sessionCodes";
import {
  cancelOpenPendingQuestions,
  postGameSystemMessage,
} from "./firestoreSessionExtras";
import {
  buildMemberUidsAfterHeal,
  sanitizeReturningMemberUid,
} from "../../domain/session/returningMember";

const HIDER_ROLE_POLL_MS = 250;
const HIDER_ROLE_POLL_MAX_MS = 3000;

function sessionsCollection() {
  return collection(getFirestoreDb(), "sessions");
}

function sessionCodeDoc(code: string) {
  return doc(getFirestoreDb(), "sessionCodes", code);
}

function annotationsCollection(sessionId: string) {
  return collection(getFirestoreDb(), "sessions", sessionId, "annotations");
}

export function isFirestorePermissionDenied(error: unknown): boolean {
  return error instanceof FirebaseError && error.code === "permission-denied";
}

type SessionMembershipPatch = {
  memberUids?: string[];
  memberRoles?: Record<string, PlayerRole>;
  memberAppVersions?: Record<string, string>;
};

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

export type EnsureRemoteSessionMembershipOptions = {
  returningMemberUid?: string | null;
  persistedMyUid?: string | null;
};

type JoinRemoteSessionOptions = {
  returningMemberUid?: string;
  persistedMyUid?: string | null;
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

const JOIN_PREVIEW_PLACEHOLDER_AREA: GameArea = {
  type: "Polygon",
  coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
};

function buildJoinPreviewSession(
  sessionId: string,
  code: string,
  codeRecord: SessionCodeRecord,
): SessionRecord {
  return {
    id: sessionId,
    code,
    gameArea: JOIN_PREVIEW_PLACEHOLDER_AREA,
    hostUid: codeRecord.hostUid,
    createdAt: codeRecord.createdAt ?? new Date().toISOString(),
    memberUids: [],
    memberRoles: {},
    gameSize: "medium",
    distanceUnit: "imperial",
    hidingZoneRadiusMeters: 402,
    tier: codeRecord.tier ?? "free",
    hostAppVersion: codeRecord.hostAppVersion,
    status: codeRecord.status ?? "active",
  };
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
      `Session requires a newer app version (v${result.hostVersion}). Update to continue.`,
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

    code = generateSessionCode();
    attempts += 1;
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
  const existingRoles =
    data.memberRoles && typeof data.memberRoles === "object"
      ? (data.memberRoles as Record<string, PlayerRole>)
      : {};
  const existingMemberUids = Array.isArray(data.memberUids)
    ? data.memberUids.filter((memberUid): memberUid is string => typeof memberUid === "string")
    : [];

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
    )
  ) {
    return {
      status: "incompatible",
      hostVersion: sessionForVersionCheck.hostAppVersion ?? clientVersion,
    };
  }

  const memberUids = buildMemberUidsAfterHeal(
    existingMemberUids,
    uid,
    returningMemberUid,
  );
  const memberRoles = { ...existingRoles, [uid]: role };
  if (returningMemberUid != null && returningMemberUid !== uid) {
    delete memberRoles[returningMemberUid];
  }
  const roleChanged = existingRoles[uid] !== role;

  const existingMemberAppVersions =
    data.memberAppVersions && typeof data.memberAppVersions === "object"
      ? (data.memberAppVersions as Record<string, string>)
      : {};
  const memberAppVersions = {
    ...existingMemberAppVersions,
    [uid]: clientVersion,
  };
  if (returningMemberUid != null && returningMemberUid !== uid) {
    delete memberAppVersions[returningMemberUid];
  }

  if (!existingMemberUids.includes(uid) || returningMemberUid != null) {
    await writeSessionMembershipPatch(sessionDoc.ref, {
      memberUids,
      memberRoles,
      memberAppVersions,
    });
  } else if (!existingRoles[uid] || roleChanged) {
    await writeSessionMembershipPatch(sessionDoc.ref, {
      memberRoles,
      memberAppVersions,
    });
  } else if (existingMemberAppVersions[uid] !== clientVersion) {
    await writeSessionMembershipPatch(sessionDoc.ref, { memberAppVersions });
  }

  return {
    status: "joined",
    session: deserializeSessionFromFirestore(sessionDoc.id, {
      ...data,
      memberUids,
      memberRoles,
      memberAppVersions,
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
    !sessionVersionCompatible(previewSession, clientVersion, uid)
  ) {
    return {
      status: "incompatible",
      hostVersion: previewSession.hostAppVersion ?? clientVersion,
    };
  }

  const sessionRef = doc(sessionsCollection(), sessionId);
  const updatePayload: Record<string, unknown> = {
    memberUids: arrayUnion(uid),
    [`memberRoles.${uid}`]: role,
    [`memberAppVersions.${uid}`]: clientVersion,
  };

  if (returningMemberUid != null) {
    await updateDoc(sessionRef, {
      memberUids: arrayUnion(uid),
      [`memberRoles.${uid}`]: role,
      [`memberAppVersions.${uid}`]: clientVersion,
    });
    if (returningMemberUid !== uid) {
      await updateDoc(sessionRef, {
        memberUids: arrayRemove(returningMemberUid),
        [`memberRoles.${returningMemberUid}`]: deleteField(),
        [`memberAppVersions.${returningMemberUid}`]: deleteField(),
      });
    }
  } else {
    await updateDoc(sessionRef, updatePayload);
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

export async function joinRemoteSessionByCode(
  code: string,
  uid: string,
  role: PlayerRole = "seeker",
  clientVersion: string = APP_VERSION,
  options: JoinRemoteSessionOptions = {},
): Promise<
  | { status: "missing" }
  | { status: "ended" }
  | { status: "incompatible"; hostVersion: string }
  | { status: "joined"; session: SessionRecord }
> {
  const codeRecord = await readSessionCodeRecord(code);
  if (!codeRecord) {
    return { status: "missing" };
  }

  if (codeRecord.status === "ended") {
    return { status: "ended" };
  }

  const returningMemberUid = sanitizeJoinReturningMemberUid(options);
  let sessionDoc: Awaited<ReturnType<typeof getDoc>>;
  try {
    sessionDoc = await getDoc(doc(sessionsCollection(), codeRecord.sessionId));
  } catch (error) {
    if (!isFirestorePermissionDenied(error)) {
      throw error;
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

  if (!sessionDoc.exists()) {
    return { status: "missing" };
  }

  const data = sessionDoc.data() as Record<string, unknown>;
  if (typeof data.endedAt === "string") {
    return { status: "ended" };
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
    await updateDoc(sessionCodeDoc(session.code), {
      status: "ended",
    });
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

export async function requestEndGameSession(
  sessionId: string,
  requestedByUid: string,
): Promise<void> {
  await updateDoc(doc(sessionsCollection(), sessionId), {
    endGameRequestedAt: new Date().toISOString(),
    endGameRequestedByUid: requestedByUid,
  });
}

export async function acceptEndGameSession(
  sessionId: string,
  acceptedByUid: string,
): Promise<void> {
  await updateDoc(doc(sessionsCollection(), sessionId), {
    endGameStartedAt: new Date().toISOString(),
    endGameStartedByUid: acceptedByUid,
    endGameRequestedAt: deleteField(),
    endGameRequestedByUid: deleteField(),
  });
}

export async function startEndGameSession(
  sessionId: string,
  startedByUid: string,
): Promise<void> {
  await requestEndGameSession(sessionId, startedByUid);
}

export async function resetEndGameSession(sessionId: string): Promise<void> {
  await updateDoc(doc(sessionsCollection(), sessionId), {
    endGameStartedAt: deleteField(),
    endGameStartedByUid: deleteField(),
    endGameRequestedAt: deleteField(),
    endGameRequestedByUid: deleteField(),
  });
}

export async function resetRemoteSession(
  sessionId: string,
  hostUid: string,
  hostRole: PlayerRole,
): Promise<string> {
  const resetAt = new Date().toISOString();

  const snapshot = await getDocs(annotationsCollection(sessionId));
  const deleted = snapshot.docs
    .map((annotationDoc) =>
      deserializeAnnotationFromFirestore(
        sessionId,
        annotationDoc.id,
        annotationDoc.data() as Record<string, unknown>,
      ),
    )
    .filter((annotation) => annotation.status === "active");

  for (let index = 0; index < deleted.length; index += FIRESTORE_BATCH_LIMIT) {
    const chunk = deleted.slice(index, index + FIRESTORE_BATCH_LIMIT);
    const batch = writeBatch(getFirestoreDb());

    for (const annotation of chunk) {
      batch.update(doc(annotationsCollection(sessionId), annotation.id), {
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
    endGameRequestedAt: deleteField(),
    endGameRequestedByUid: deleteField(),
  });

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

export async function writeRemoteAnnotation(
  sessionId: string,
  annotation: AnnotationRecord,
): Promise<void> {
  const annotationRef = doc(annotationsCollection(sessionId), annotation.id);
  await setDoc(annotationRef, {
    ...buildAnnotationDocument(annotation),
    updatedAt: serverTimestamp(),
  });
}

const FIRESTORE_BATCH_LIMIT = 500;

export async function writeRemoteAnnotationsBatch(
  sessionId: string,
  annotations: AnnotationRecord[],
): Promise<void> {
  if (annotations.length === 0) {
    return;
  }

  for (let index = 0; index < annotations.length; index += FIRESTORE_BATCH_LIMIT) {
    const chunk = annotations.slice(index, index + FIRESTORE_BATCH_LIMIT);
    const batch = writeBatch(getFirestoreDb());

    for (const annotation of chunk) {
      const annotationRef = doc(annotationsCollection(sessionId), annotation.id);
      batch.set(annotationRef, {
        ...buildAnnotationDocument(annotation),
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
  }
}

export function subscribeToRemoteAnnotations(
  sessionId: string,
  onChange: (annotations: AnnotationRecord[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    annotationsCollection(sessionId),
    (snapshot) => {
      const annotations = snapshot.docs.map((annotationDoc) =>
        deserializeAnnotationFromFirestore(
          sessionId,
          annotationDoc.id,
          annotationDoc.data() as Record<string, unknown>,
        ),
      );

      onChange(annotations);
    },
    (error) => onError(error),
  );
}
