import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  addDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { FirebaseError } from "firebase/app";
import type { PlayerRole } from "../../domain/session/playerRole";
import type { HidingZoneRecord } from "../../domain/session/hidingZone";
import type { TimeTrapRecord } from "../../domain/expansion/timeTraps";
import {
  createMessageId,
  type PendingQuestionRecord,
  type PlayerLocationRecord,
  type SessionMessageRecord,
} from "../../domain/session/sessionChat";
import type { PlayerTrailPointRecord } from "../../domain/game/playerTrail";
import type { StartingLocationRecord } from "../../domain/game/startingLocation";
import { listWalkingThermometerQuestionIds } from "../../domain/questions";
import { getFirestoreDb } from "../core/firebase";
import { captureException } from "../core/sentry";
import {
  buildHidingZoneDocument,
  buildPendingQuestionDocument,
  buildPlayerLocationDocument,
  buildSessionMessageDocument,
  buildTimeTrapDocument,
  deserializeHidingZoneFromFirestore,
  deserializePendingQuestionFromFirestore,
  deserializePlayerLocationFromFirestore,
  deserializeSessionMessageFromFirestore,
  deserializeTimeTrapFromFirestore,
  stripUndefinedValues,
} from "./firestoreSerialization";

const THERMOMETER_WALK_CANCEL_TEXT = {
  left: "Thermometer walk cancelled — seeker left.",
  orphan: "Thermometer walk cancelled — seeker left the session.",
} as const;

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

function hidingZonesCollection(sessionId: string) {
  return collection(getFirestoreDb(), "sessions", sessionId, "hidingZones");
}

function timeTrapsCollection(sessionId: string) {
  return collection(getFirestoreDb(), "sessions", sessionId, "timeTraps");
}

function playerTrailPointsCollection(sessionId: string, uid: string) {
  return collection(
    getFirestoreDb(),
    "sessions",
    sessionId,
    "playerTrailPoints",
    uid,
    "points",
  );
}

function startingLocationsCollection(sessionId: string) {
  return collection(getFirestoreDb(), "sessions", sessionId, "startingLocations");
}

export async function writePlayerLocation(
  sessionId: string,
  location: PlayerLocationRecord,
): Promise<void> {
  await setDoc(
    doc(playerLocationsCollection(sessionId), location.uid),
    buildPlayerLocationDocument(location),
  );
}

export async function appendPlayerTrailPoint(
  sessionId: string,
  point: PlayerTrailPointRecord,
): Promise<void> {
  try {
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
          accuracyMeters:
            typeof data.accuracyMeters === "number"
              ? data.accuracyMeters
              : undefined,
          role: (data.role as PlayerRole) ?? "seeker",
          capturedAt: String(data.capturedAt),
        } satisfies StartingLocationRecord;
      });
      onChange(locations);
    },
    (error) => onError(error),
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
    (error) => onError(error),
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
    (error) => onError(error),
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
    (error) => onError(error),
  );
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
  return onSnapshot(
    query(messagesCollection(sessionId), orderBy("createdAt", "asc")),
    (snapshot) => {
      const messages = snapshot.docs.map((messageDoc) =>
        deserializeSessionMessageFromFirestore(
          messageDoc.id,
          sessionId,
          messageDoc.data() as Record<string, unknown>,
        ),
      );
      onChange(messages);
    },
    (error) => onError(error),
  );
}

export async function writePendingQuestion(
  sessionId: string,
  question: PendingQuestionRecord,
): Promise<void> {
  await setDoc(
    doc(pendingQuestionsCollection(sessionId), question.id),
    buildPendingQuestionDocument(question),
  );
}

export async function deletePendingQuestion(
  sessionId: string,
  questionId: string,
): Promise<void> {
  await deleteDoc(doc(pendingQuestionsCollection(sessionId), questionId));
}

export async function updatePendingQuestion(
  sessionId: string,
  questionId: string,
  patch: Partial<
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
  >,
): Promise<void> {
  await updateDoc(
    doc(pendingQuestionsCollection(sessionId), questionId),
    stripUndefinedValues(patch) as Record<string, unknown>,
  );
}

const OPEN_PENDING_QUESTION_STATUSES = new Set([
  "pending",
  "walking",
  "answered",
]);

export async function cancelOpenPendingQuestions(
  sessionId: string,
): Promise<void> {
  const snapshot = await getDocs(pendingQuestionsCollection(sessionId));
  const toCancel = snapshot.docs.filter((questionDoc) => {
    const status = questionDoc.data().status;
    return (
      typeof status === "string" && OPEN_PENDING_QUESTION_STATUSES.has(status)
    );
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
  reason: "left" | "orphan",
): Promise<void> {
  if (questionIds.length === 0) {
    return;
  }

  await cancelWalkingThermometerQuestions(sessionId, questionIds);
  await postGameSystemMessage(
    sessionId,
    senderUid,
    senderRole,
    THERMOMETER_WALK_CANCEL_TEXT[reason],
    createMessageId(),
  );
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
    await cancelWalkingThermometersAndAnnounce(
      sessionId,
      walkIds,
      senderUid,
      senderRole,
      "orphan",
    );
  } catch (error) {
    captureException(error);
  }
}

export async function updateGameMessageAnswer(
  sessionId: string,
  messageId: string,
  selectedReply: string,
): Promise<void> {
  await updateDoc(doc(messagesCollection(sessionId), messageId), {
    selectedReply,
    status: "answered",
  });
}

export function subscribeToPendingQuestions(
  sessionId: string,
  onChange: (questions: PendingQuestionRecord[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    pendingQuestionsCollection(sessionId),
    (snapshot) => {
      const questions = snapshot.docs.map((questionDoc) =>
        deserializePendingQuestionFromFirestore(
          questionDoc.id,
          sessionId,
          questionDoc.data() as Record<string, unknown>,
        ),
      );
      onChange(questions);
    },
    (error) => onError(error),
  );
}

export async function writeHidingZone(
  sessionId: string,
  zone: HidingZoneRecord,
): Promise<void> {
  await setDoc(
    doc(hidingZonesCollection(sessionId), zone.hiderUid),
    buildHidingZoneDocument(zone),
  );
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
    (error) => onError(error),
  );
}

export async function writeTimeTrap(
  sessionId: string,
  trap: TimeTrapRecord,
): Promise<void> {
  await setDoc(
    doc(timeTrapsCollection(sessionId), trap.hiderUid),
    buildTimeTrapDocument(trap),
  );
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
    (error) => onError(error),
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

export async function postGameSystemMessage(
  sessionId: string,
  senderUid: string,
  senderRole: PlayerRole,
  text: string,
  messageId: string,
): Promise<void> {
  await writeSessionMessage(sessionId, {
    id: messageId,
    sessionId,
    channel: "game",
    senderUid,
    senderRole,
    createdAt: new Date().toISOString(),
    kind: "system",
    text,
  });
}

export { sessionDoc, serverTimestamp };
