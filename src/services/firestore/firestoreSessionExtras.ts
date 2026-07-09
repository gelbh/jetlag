import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import type { PlayerRole } from "../../domain/session/playerRole";
import type { HidingZoneRecord } from "../../domain/session/hidingZone";
import type { TimeTrapRecord } from "../../domain/expansion/timeTraps";
import type {
  PendingQuestionRecord,
  PlayerLocationRecord,
  SessionMessageRecord,
} from "../../domain/session/sessionChat";
import { getFirestoreDb } from "../core/firebase";
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

export async function writePlayerLocation(
  sessionId: string,
  location: PlayerLocationRecord,
): Promise<void> {
  await setDoc(
    doc(playerLocationsCollection(sessionId), location.uid),
    buildPlayerLocationDocument(location),
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
