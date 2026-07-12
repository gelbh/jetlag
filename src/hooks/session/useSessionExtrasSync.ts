import { useMemo } from "react";
import type { HidingZoneRecord } from "../../domain/session/hidingZone";
import {
  isHiderLocationRole,
  isSeekerLocationRole,
} from "../../domain/session/liveMapLocations";
import type {
  PendingQuestionRecord,
  PlayerLocationRecord,
  SessionMessageRecord,
} from "../../domain/session/sessionChat";
import { filterExtrasAfterReset } from "../../domain/session/sessionReset";
import {
  subscribeToHiderPlayerLocations,
  subscribeToHidingZones,
  subscribeToPendingQuestions,
  subscribeToSeekerPlayerLocations,
  subscribeToSessionMessages,
} from "../../services/firestore/firestoreSessionExtras";
import { useSessionStore } from "../../state/sessionStore";
import { useFirestoreCollectionSync } from "../sync/useFirestoreCollectionSync";

function useSessionResetAt(): string | undefined {
  return useSessionStore((state) => state.session?.sessionResetAt);
}

export function usePlayerLocationsSync(sessionId: string | undefined) {
  const sessionResetAt = useSessionResetAt();
  const items = useFirestoreCollectionSync<PlayerLocationRecord>(
    sessionId,
    subscribeToSeekerPlayerLocations,
  );

  return useMemo(
    () =>
      filterExtrasAfterReset(items, sessionResetAt, (location) => location.updatedAt),
    [items, sessionResetAt],
  );
}

export function useSeekerLocationsSync(sessionId: string | undefined) {
  const sessionResetAt = useSessionResetAt();
  const items = useFirestoreCollectionSync<PlayerLocationRecord>(
    sessionId,
    subscribeToSeekerPlayerLocations,
  );

  return useMemo(
    () =>
      filterExtrasAfterReset(
        items.filter((location) => isSeekerLocationRole(location.role)),
        sessionResetAt,
        (location) => location.updatedAt,
      ),
    [items, sessionResetAt],
  );
}

export function useHiderLocationsSync(
  sessionId: string | undefined,
  enabled = true,
) {
  const sessionResetAt = useSessionResetAt();
  const items = useFirestoreCollectionSync<PlayerLocationRecord>(
    enabled ? sessionId : undefined,
    subscribeToHiderPlayerLocations,
  );

  return useMemo(
    () =>
      filterExtrasAfterReset(
        items.filter((location) => isHiderLocationRole(location.role)),
        sessionResetAt,
        (location) => location.updatedAt,
      ),
    [items, sessionResetAt],
  );
}

export function useHidingZonesSync(sessionId: string | undefined) {
  const sessionResetAt = useSessionResetAt();
  const items = useFirestoreCollectionSync<HidingZoneRecord>(
    sessionId,
    subscribeToHidingZones,
  );

  return useMemo(
    () =>
      filterExtrasAfterReset(items, sessionResetAt, (zone) => zone.confirmedAt),
    [items, sessionResetAt],
  );
}

export function useSessionMessagesSync(sessionId: string | undefined) {
  const sessionResetAt = useSessionResetAt();
  const items = useFirestoreCollectionSync<SessionMessageRecord>(
    sessionId,
    subscribeToSessionMessages,
  );

  return useMemo(
    () =>
      filterExtrasAfterReset(items, sessionResetAt, (message) => message.createdAt),
    [items, sessionResetAt],
  );
}

export function usePendingQuestionsSync(sessionId: string | undefined) {
  const sessionResetAt = useSessionResetAt();
  const items = useFirestoreCollectionSync<PendingQuestionRecord>(
    sessionId,
    subscribeToPendingQuestions,
  );

  return useMemo(
    () =>
      filterExtrasAfterReset(items, sessionResetAt, (question) => question.createdAt),
    [items, sessionResetAt],
  );
}
