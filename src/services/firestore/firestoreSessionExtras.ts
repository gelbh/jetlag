import { FirebaseError } from "firebase/app";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromCache,
  getDocs,
  onSnapshot,
  orderBy,
  type QuerySnapshot,
  query,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import type { TimeTrapRecord } from "../../domain/expansion/timeTraps";
import type { PlayerTrailPointRecord } from "../../domain/game/playerTrail";
import type { StartingLocationRecord } from "../../domain/game/startingLocation";
import { listWalkingThermometerQuestionIds } from "../../domain/questions";
import {
  createMessageId,
  type PendingQuestionRecord,
  type PlayerLocationRecord,
  type SessionMessageRecord,
} from "../../domain/session/activity/sessionChat";
import type { HidingZoneRecord } from "../../domain/session/hiding/hidingZone";
import type { PlayerRole } from "../../domain/session/players/playerRole";
import { captureException } from "../core/analytics/sentry";
import { getFirestoreDb } from "../core/firebase/firebase";
import { emitQuestionCancelledActivity } from "../session/emitSessionActivity";
import { arePlayerLocationPublishesBlocked } from "../session/playerLocationPublishGate";
import {
  buildPendingQuestionDocument,
  buildPlayerLocationDocument,
  buildSessionMessageDocument,
  deserializePendingQuestionFromFirestore,
  deserializePlayerLocationFromFirestore,
  deserializeSessionMessageFromFirestore,
} from "./serialization/serializePlayer";
import {
  buildHidingZoneDocument,
  buildTimeTrapDocument,
  deserializeHidingZoneFromFirestore,
  deserializeTimeTrapFromFirestore,
} from "./serialization/serializeSession";
import { stripUndefinedValues } from "./serialization/shared";
import { handleFirestoreListenError } from "./sessions/listenError";

export const THERMOMETER_WALK_CANCEL_TEXT = {
  left: "Thermometer walk cancelled — seeker left.",
  orphan: "Thermometer walk cancelled — seeker left the session.",
  stale: "Thermometer walk cancelled — walk went stale.",
  manual: "Thermometer walk cancelled.",
} as const;

export type ThermometerWalkCancelReason = keyof typeof THERMOMETER_WALK_CANCEL_TEXT;

function sessionDoc(sessionId: string) {
  return doc(getFirestoreDb(), "sessions", sessionId);
}

function playerLocationsCollection(sessionId: string) {
  return collection(getFirestoreDb(), "sessions", sessionId, "playerLocations");
}

function messagesCollection(sessionId: string) {
  return collection(getFirestoreDb(), "sessions", sessionId, "messages");
}

function pendingQuestionsCollection(sessionId: string) {
  return collection(getFirestoreDb(), "sessions", sessionId, "pendingQuestions");
}

/**
 * Returns status string when the pending question exists; otherwise null.
 * Cache first: the pendingQuestions listener keeps it current, and a default
 * getDoc on lie-fi waits until the SDK decides it is offline (~10 s).
 */
export async function getPendingQuestionStatus(
  sessionId: string,
  questionId: string,
): Promise<string | null> {
  const ref = doc(pendingQuestionsCollection(sessionId), questionId);
  const snapshot = await getDocFromCache(ref).catch(() => getDoc(ref));
  if (!snapshot.exists()) {
    return null;
  }
  const status = snapshot.data()?.status;
  return typeof status === "string" ? status : null;
}

function hidingZonesCollection(sessionId: string) {
  return collection(getFirestoreDb(), "sessions", sessionId, "hidingZones");
}

function timeTrapsCollection(sessionId: string) {
  return collection(getFirestoreDb(), "sessions", sessionId, "timeTraps");
}

function playerTrailPointsCollection(sessionId: string, uid: string) {
  return collection(getFirestoreDb(), "sessions", sessionId, "playerTrailPoints", uid, "points");
}

function startingLocationsCollection(sessionId: string) {
  return collection(getFirestoreDb(), "sessions", sessionId, "startingLocations");
}

export async function writePlayerLocation(
  sessionId: string,
  location: PlayerLocationRecord,
): Promise<void> {
  if (arePlayerLocationPublishesBlocked()) {
    return;
  }
  await setDoc(
    doc(playerLocationsCollection(sessionId), location.uid),
    buildPlayerLocationDocument(location),
  );
}

export async function deletePlayerLocation(sessionId: string, uid: string): Promise<void> {
  await deleteDoc(doc(playerLocationsCollection(sessionId), uid));
}

export async function appendPlayerTrailPoint(
  sessionId: string,
  point: PlayerTrailPointRecord,
): Promise<void> {
  try {
    // Auto ids on purpose: rules make points create-only, so a deterministic-id
    // set replayed onto an existing point is an update and is denied anyway.
    await addDoc(playerTrailPointsCollection(sessionId, point.uid), {
      lat: point.lat,
      lng: point.lng,
      accuracyMeters: point.accuracyMeters ?? null,
      role: point.role,
      recordedAt: point.recordedAt,
    });
  } catch (error) {
    // Offline persistence can replay an already-committed create (JETLAG-1Z).
    if (isFirestoreAlreadyExistsError(error)) {
      return;
    }
    throw error;
  }
}

function isFirestoreAlreadyExistsError(error: unknown): boolean {
  if (!(error instanceof FirebaseError)) {
    return false;
  }
  return (
    error.code === "already-exists" ||
    error.code === "firestore/already-exists" ||
    /document already exists/i.test(error.message)
  );
}

export function subscribeToStartingLocations(
  sessionId: string,
  onChange: (locations: StartingLocationRecord[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    startingLocationsCollection(sessionId),
    (snapshot) => {
      const locations = snapshot.docs.map((locationDoc) => {
        const data = locationDoc.data();
        return {
          uid: locationDoc.id,
          sessionId,
          lat: Number(data.lat),
          lng: Number(data.lng),
          accuracyMeters: typeof data.accuracyMeters === "number" ? data.accuracyMeters : undefined,
          role: (data.role as PlayerRole) ?? "seeker",
          capturedAt: String(data.capturedAt),
        } satisfies StartingLocationRecord;
      });
      onChange(locations);
    },
    (error) => handleFirestoreListenError(error, onError),
  );
}

export function subscribeToPlayerLocations(
  sessionId: string,
  onChange: (locations: PlayerLocationRecord[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    playerLocationsCollection(sessionId),
    (snapshot) => {
      const locations = snapshot.docs.map((locationDoc) =>
        deserializePlayerLocationFromFirestore(
          locationDoc.id,
          sessionId,
          locationDoc.data() as Record<string, unknown>,
        ),
      );
      onChange(locations);
    },
    (error) => handleFirestoreListenError(error, onError),
  );
}

function mapPlayerLocationSnapshot(
  sessionId: string,
  snapshot: { docs: Array<{ id: string; data: () => Record<string, unknown> }> },
): PlayerLocationRecord[] {
  return snapshot.docs.map((locationDoc) =>
    deserializePlayerLocationFromFirestore(
      locationDoc.id,
      sessionId,
      locationDoc.data() as Record<string, unknown>,
    ),
  );
}

export function subscribeToSeekerPlayerLocations(
  sessionId: string,
  onChange: (locations: PlayerLocationRecord[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(playerLocationsCollection(sessionId), where("role", "==", "seeker")),
    (snapshot) => onChange(mapPlayerLocationSnapshot(sessionId, snapshot)),
    (error) => handleFirestoreListenError(error, onError),
  );
}

export function subscribeToHiderPlayerLocations(
  sessionId: string,
  onChange: (locations: PlayerLocationRecord[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(playerLocationsCollection(sessionId), where("role", "==", "hider")),
    (snapshot) => onChange(mapPlayerLocationSnapshot(sessionId, snapshot)),
    (error) => handleFirestoreListenError(error, onError),
  );
}

/**
 * Listeners opened with `includeMetadataChanges` also fire on query-level
 * `fromCache` flips that change no document; skip those (after the first
 * emit, which must go out even for an empty collection) to avoid re-renders.
 */
function createMetadataSnapshotGate(): (snapshot: Pick<QuerySnapshot, "docChanges">) => boolean {
  let emitted = false;
  return (snapshot) => {
    if (emitted && snapshot.docChanges({ includeMetadataChanges: true }).length === 0) {
      return false;
    }
    emitted = true;
    return true;
  };
}

/** View-only flag for "Waiting to send" badges; never serialized. */
function withPendingSync<T extends { pendingSync?: boolean }>(
  record: T,
  hasPendingWrites: boolean,
): T {
  return hasPendingWrites ? { ...record, pendingSync: true } : record;
}

export async function writeSessionMessage(
  sessionId: string,
  message: SessionMessageRecord,
): Promise<void> {
  await setDoc(
    doc(messagesCollection(sessionId), message.id),
    buildSessionMessageDocument(message),
  );
}

export function subscribeToSessionMessages(
  sessionId: string,
  onChange: (messages: SessionMessageRecord[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const shouldEmit = createMetadataSnapshotGate();
  return onSnapshot(
    query(messagesCollection(sessionId), orderBy("createdAt", "asc")),
    { includeMetadataChanges: true },
    (snapshot) => {
      if (!shouldEmit(snapshot)) {
        return;
      }
      const messages = snapshot.docs.map((messageDoc) =>
        withPendingSync(
          deserializeSessionMessageFromFirestore(
            messageDoc.id,
            sessionId,
            messageDoc.data() as Record<string, unknown>,
          ),
          messageDoc.metadata.hasPendingWrites,
        ),
      );
      onChange(messages);
    },
    (error) => handleFirestoreListenError(error, onError),
  );
}

/**
 * Question + its chat row in one atomic batch: queued offline as a unit, so
 * there is no half-asked state to compensate. Pending asks get `receivedAt`
 * stamped by the server so the hider's answer window starts on arrival;
 * walking asks get it when the walk completes (`stampReceivedAt`).
 */
export async function writeAskedQuestionBatch(
  sessionId: string,
  question: PendingQuestionRecord,
  message: SessionMessageRecord,
): Promise<void> {
  const batch = writeBatch(getFirestoreDb());
  batch.set(doc(pendingQuestionsCollection(sessionId), question.id), {
    ...buildPendingQuestionDocument(question),
    ...(question.status === "pending" ? { receivedAt: serverTimestamp() } : {}),
  });
  batch.set(doc(messagesCollection(sessionId), message.id), buildSessionMessageDocument(message));
  await batch.commit();
}

export type PendingQuestionPatch = Partial<
  Pick<
    PendingQuestionRecord,
    | "status"
    | "answer"
    | "resolvedAnnotationId"
    | "placement"
    | "promptText"
    | "replyOptions"
    | "answerableAt"
    | "deadlineExpiredAt"
    | "answeredLate"
    | "cardDraw"
    | "cardKeep"
  >
>;

/** A question transition plus the chat writes that announce it. */
export interface PendingQuestionBatchWrites {
  questionId: string;
  questionPatch: PendingQuestionPatch;
  /** Patch to the question's existing chat row. */
  gameMessage?: {
    id: string;
    patch: { status: "answered" | "cancelled"; selectedReply?: string };
  };
  /** New chat row (system notice, or the question row when a walk completes). */
  newMessage?: SessionMessageRecord;
  /** Stamp server receipt: the question becomes answerable for the hider with this write. */
  stampReceivedAt?: boolean;
}

/** Applied atomically so an offline queue never replays half a transition. */
export async function writePendingQuestionUpdateBatch(
  sessionId: string,
  writes: PendingQuestionBatchWrites,
): Promise<void> {
  const batch = writeBatch(getFirestoreDb());
  batch.update(doc(pendingQuestionsCollection(sessionId), writes.questionId), {
    ...(stripUndefinedValues(writes.questionPatch) as Record<string, unknown>),
    ...(writes.stampReceivedAt ? { receivedAt: serverTimestamp() } : {}),
  });
  if (writes.gameMessage) {
    batch.update(
      doc(messagesCollection(sessionId), writes.gameMessage.id),
      stripUndefinedValues(writes.gameMessage.patch) as Record<string, unknown>,
    );
  }
  if (writes.newMessage) {
    batch.set(
      doc(messagesCollection(sessionId), writes.newMessage.id),
      buildSessionMessageDocument(writes.newMessage),
    );
  }
  await batch.commit();
}

export async function updatePendingQuestion(
  sessionId: string,
  questionId: string,
  patch: PendingQuestionPatch,
): Promise<void> {
  await updateDoc(
    doc(pendingQuestionsCollection(sessionId), questionId),
    stripUndefinedValues(patch) as Record<string, unknown>,
  );
}

const OPEN_PENDING_QUESTION_STATUSES = new Set(["pending", "walking", "answered"]);

export async function cancelOpenPendingQuestions(sessionId: string): Promise<void> {
  const snapshot = await getDocs(pendingQuestionsCollection(sessionId));
  const toCancel = snapshot.docs.filter((questionDoc) => {
    const status = questionDoc.data().status;
    return typeof status === "string" && OPEN_PENDING_QUESTION_STATUSES.has(status);
  });

  for (let index = 0; index < toCancel.length; index += 500) {
    const chunk = toCancel.slice(index, index + 500);
    const batch = writeBatch(getFirestoreDb());

    for (const questionDoc of chunk) {
      batch.update(questionDoc.ref, { status: "cancelled" });
    }

    await batch.commit();
  }
}

export async function cancelWalkingThermometerQuestions(
  sessionId: string,
  questionIds: readonly string[],
): Promise<void> {
  if (questionIds.length === 0) {
    return;
  }

  const collectionRef = pendingQuestionsCollection(sessionId);

  for (let index = 0; index < questionIds.length; index += 500) {
    const chunk = questionIds.slice(index, index + 500);
    const batch = writeBatch(getFirestoreDb());

    for (const questionId of chunk) {
      batch.update(doc(collectionRef, questionId), { status: "cancelled" });
    }

    await batch.commit();
  }
}

export async function cancelWalkingThermometersAndAnnounce(
  sessionId: string,
  questionIds: readonly string[],
  senderUid: string,
  senderRole: PlayerRole,
  reason: Exclude<ThermometerWalkCancelReason, "manual">,
): Promise<void> {
  if (questionIds.length === 0) {
    return;
  }

  const stillWalking: string[] = [];
  for (const questionId of questionIds) {
    const status = await getPendingQuestionStatus(sessionId, questionId);
    if (status === "walking") {
      stillWalking.push(questionId);
    }
  }
  if (stillWalking.length === 0) {
    return;
  }

  await cancelWalkingThermometerQuestions(sessionId, stillWalking);
  await postGameSystemMessage(
    sessionId,
    senderUid,
    senderRole,
    THERMOMETER_WALK_CANCEL_TEXT[reason],
    createMessageId(),
  );

  for (const pendingQuestionId of stillWalking) {
    emitQuestionCancelledActivity({
      sessionId,
      toolType: "thermometer",
      promptText: "Thermometer walk",
      pendingQuestionId,
      createdByUid: senderUid,
    });
  }
}

export async function cancelWalkingThermometersAfterIdentityHeal(
  sessionId: string,
  oldUid: string,
  senderUid: string,
  senderRole: PlayerRole,
): Promise<void> {
  try {
    const snapshot = await getDocs(pendingQuestionsCollection(sessionId));
    const questions = snapshot.docs.map((questionDoc) =>
      deserializePendingQuestionFromFirestore(
        questionDoc.id,
        sessionId,
        questionDoc.data() as Record<string, unknown>,
      ),
    );
    const walkIds = listWalkingThermometerQuestionIds(questions, oldUid);
    await cancelWalkingThermometersAndAnnounce(sessionId, walkIds, senderUid, senderRole, "orphan");
  } catch (error) {
    captureException(error);
  }
}

export function subscribeToPendingQuestions(
  sessionId: string,
  onChange: (questions: PendingQuestionRecord[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const shouldEmit = createMetadataSnapshotGate();
  return onSnapshot(
    pendingQuestionsCollection(sessionId),
    { includeMetadataChanges: true },
    (snapshot) => {
      if (!shouldEmit(snapshot)) {
        return;
      }
      const questions = snapshot.docs.map((questionDoc) =>
        withPendingSync(
          deserializePendingQuestionFromFirestore(
            questionDoc.id,
            sessionId,
            questionDoc.data() as Record<string, unknown>,
          ),
          questionDoc.metadata.hasPendingWrites,
        ),
      );
      onChange(questions);
    },
    (error) => handleFirestoreListenError(error, onError),
  );
}

export async function writeHidingZone(sessionId: string, zone: HidingZoneRecord): Promise<void> {
  await setDoc(doc(hidingZonesCollection(sessionId), zone.hiderUid), buildHidingZoneDocument(zone));
}

export function subscribeToHidingZones(
  sessionId: string,
  onChange: (zones: HidingZoneRecord[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    hidingZonesCollection(sessionId),
    (snapshot) => {
      const zones = snapshot.docs.map((zoneDoc) =>
        deserializeHidingZoneFromFirestore(
          zoneDoc.id,
          sessionId,
          zoneDoc.data() as Record<string, unknown>,
        ),
      );
      onChange(zones);
    },
    (error) => handleFirestoreListenError(error, onError),
  );
}

export async function writeTimeTrap(sessionId: string, trap: TimeTrapRecord): Promise<void> {
  await setDoc(doc(timeTrapsCollection(sessionId), trap.hiderUid), buildTimeTrapDocument(trap));
}

export function subscribeToTimeTraps(
  sessionId: string,
  onChange: (traps: TimeTrapRecord[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    timeTrapsCollection(sessionId),
    (snapshot) => {
      const traps = snapshot.docs.map((trapDoc) =>
        deserializeTimeTrapFromFirestore(
          trapDoc.id,
          sessionId,
          trapDoc.data() as Record<string, unknown>,
        ),
      );
      onChange(traps);
    },
    (error) => handleFirestoreListenError(error, onError),
  );
}

export async function postSocialMessage(
  sessionId: string,
  senderUid: string,
  senderRole: PlayerRole,
  text: string,
  messageId: string,
): Promise<void> {
  await writeSessionMessage(sessionId, {
    id: messageId,
    sessionId,
    channel: "social",
    senderUid,
    senderRole,
    createdAt: new Date().toISOString(),
    text: text.trim(),
  });
}

export function buildGameSystemMessage(
  sessionId: string,
  senderUid: string,
  senderRole: PlayerRole,
  text: string,
  messageId: string,
  createdAt: string = new Date().toISOString(),
): SessionMessageRecord {
  return {
    id: messageId,
    sessionId,
    channel: "game",
    senderUid,
    senderRole,
    createdAt,
    kind: "system",
    text,
  };
}

export async function postGameSystemMessage(
  sessionId: string,
  senderUid: string,
  senderRole: PlayerRole,
  text: string,
  messageId: string,
  createdAt?: string,
): Promise<void> {
  await writeSessionMessage(
    sessionId,
    buildGameSystemMessage(sessionId, senderUid, senderRole, text, messageId, createdAt),
  );
}

export { serverTimestamp, sessionDoc };
