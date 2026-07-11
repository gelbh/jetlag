import { FirebaseError } from "firebase/app";
import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocFromServer,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type DocumentReference,
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
import { photoUploadAccessError } from "../../domain/questions/photoUploadAccess";
import { generateSessionCode } from "../session/sessionCodes";

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

export async function ensureRemoteSessionWriteAccess(
  session: SessionRecord,
  uid: string,
  role: PlayerRole = resolvePlayerRole(session.memberRoles, uid),
): Promise<SessionRecord> {
  if (session.memberUids.includes(uid)) {
    return session;
  }

  const result = await joinRemoteSessionByCode(session.code, uid, role);

  if (result.status === "joined") {
    return result.session;
  }

  if (result.status === "incompatible") {
    throw new Error(
      `Session requires a newer app version (v${result.hostVersion}). Update to continue.`,
    );
  }

  if (result.status === "ended") {
    throw new Error("That session has ended. Join or create a new one.");
  }

  throw new Error("No access to that session.");
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
  const codeDoc = await getDoc(sessionCodeDoc(code));
  if (!codeDoc.exists()) {
    return { status: "missing" };
  }

  const sessionId = codeDoc.data().sessionId;
  if (typeof sessionId !== "string") {
    return { status: "missing" };
  }

  const sessionDoc = await getDoc(doc(sessionsCollection(), sessionId));
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
}

export async function joinRemoteSessionByCode(
  code: string,
  uid: string,
  role: PlayerRole = "seeker",
  clientVersion: string = APP_VERSION,
): Promise<
  | { status: "missing" }
  | { status: "ended" }
  | { status: "incompatible"; hostVersion: string }
  | { status: "joined"; session: SessionRecord }
> {
  const codeDoc = await getDoc(sessionCodeDoc(code));
  if (!codeDoc.exists()) {
    return { status: "missing" };
  }

  const sessionId = codeDoc.data().sessionId;
  if (typeof sessionId !== "string") {
    return { status: "missing" };
  }

  const sessionDoc = await getDoc(doc(sessionsCollection(), sessionId));
  if (!sessionDoc.exists()) {
    return { status: "missing" };
  }

  const data = sessionDoc.data() as Record<string, unknown>;
  if (typeof data.endedAt === "string") {
    return { status: "ended" };
  }

  const existingRoles =
    data.memberRoles && typeof data.memberRoles === "object"
      ? (data.memberRoles as Record<string, PlayerRole>)
      : {};
  const existingMemberUids = Array.isArray(data.memberUids)
    ? data.memberUids.filter((memberUid): memberUid is string => typeof memberUid === "string")
    : [];

  const sessionForVersionCheck = deserializeSessionFromFirestore(sessionDoc.id, data);
  if (
    !existingMemberUids.includes(uid) &&
    !sessionVersionCompatible(sessionForVersionCheck, clientVersion, uid)
  ) {
    return {
      status: "incompatible",
      hostVersion: sessionForVersionCheck.hostAppVersion ?? clientVersion,
    };
  }

  const memberUids = Array.from(new Set([...existingMemberUids, uid]));
  const memberRoles = {
    ...existingRoles,
    [uid]: role,
  };
  const roleChanged = existingRoles[uid] !== role;

  const existingMemberAppVersions =
    data.memberAppVersions && typeof data.memberAppVersions === "object"
      ? (data.memberAppVersions as Record<string, string>)
      : {};
  const memberAppVersions = {
    ...existingMemberAppVersions,
    [uid]: clientVersion,
  };

  if (!existingMemberUids.includes(uid)) {
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
): Promise<SessionRecord> {
  let serverSession = await getRemoteSessionByIdFromServer(session.id);
  if (!serverSession) {
    throw new Error("Syncing session… Try again in a moment.");
  }

  if (!serverSessionGrantsHiderUpload(serverSession, uid)) {
    const result = await joinRemoteSessionByCode(serverSession.code, uid, "hider");

    if (result.status === "incompatible") {
      throw new Error(
        `Session requires a newer app version (v${result.hostVersion}). Update to continue.`,
      );
    }

    if (result.status === "ended") {
      throw new Error("That session has ended. Join or create a new one.");
    }

    if (result.status !== "joined") {
      throw new Error(
        "You are not a member of this session. Rejoin with the session code.",
      );
    }

    serverSession =
      (await waitForServerHiderRole(session.id, uid)) ?? result.session;
  }

  const accessError = photoUploadAccessError(serverSession, uid);
  if (accessError) {
    throw new Error(accessError);
  }

  return serverSession;
}

export async function endRemoteSession(sessionId: string): Promise<void> {
  await updateDoc(doc(sessionsCollection(), sessionId), {
    endedAt: new Date().toISOString(),
    status: "ended",
    code: deleteField(),
  });
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
