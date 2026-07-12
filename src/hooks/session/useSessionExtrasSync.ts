import type { HidingZoneRecord } from "../../domain/session/hidingZone";
import type {
  PendingQuestionRecord,
  PlayerLocationRecord,
  SessionMessageRecord,
} from "../../domain/session/sessionChat";
import {
  subscribeToHidingZones,
  subscribeToPendingQuestions,
  subscribeToPlayerLocations,
  subscribeToSessionMessages,
} from "../../services/firestore/firestoreSessionExtras";
import { useFirestoreCollectionSync } from "../sync/useFirestoreCollectionSync";

export function usePlayerLocationsSync(sessionId: string | undefined) {
  return useFirestoreCollectionSync<PlayerLocationRecord>(
    sessionId,
    subscribeToPlayerLocations,
  );
}

export function useHidingZonesSync(sessionId: string | undefined) {
  return useFirestoreCollectionSync<HidingZoneRecord>(
    sessionId,
    subscribeToHidingZones,
  );
}

export function useSessionMessagesSync(sessionId: string | undefined) {
  return useFirestoreCollectionSync<SessionMessageRecord>(
    sessionId,
    subscribeToSessionMessages,
  );
}

export function usePendingQuestionsSync(sessionId: string | undefined) {
  return useFirestoreCollectionSync<PendingQuestionRecord>(
    sessionId,
    subscribeToPendingQuestions,
  );
}
