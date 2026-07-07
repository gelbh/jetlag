import { useEffect, useState } from "react";
import { LOCAL_SESSION_ID } from "../../domain/map/annotations";
import type { HidingZoneRecord } from "../../domain/session/hidingZone";
import type {
  PendingQuestionRecord,
  PlayerLocationRecord,
  SessionMessageRecord,
} from "../../domain/session/sessionChat";
import { isFirebaseConfigured } from "../../services/core/firebase";
import {
  subscribeToHidingZones,
  subscribeToPendingQuestions,
  subscribeToPlayerLocations,
  subscribeToSessionMessages,
} from "../../services/firestore/firestoreSessionExtras";

function isRemoteSession(sessionId: string | undefined): sessionId is string {
  return (
    Boolean(sessionId) &&
    isFirebaseConfigured() &&
    sessionId !== LOCAL_SESSION_ID
  );
}

export function usePlayerLocationsSync(sessionId: string | undefined) {
  const [locations, setLocations] = useState<PlayerLocationRecord[]>([]);

  useEffect(() => {
    if (!isRemoteSession(sessionId)) {
      return;
    }

    const unsubscribe = subscribeToPlayerLocations(
      sessionId,
      setLocations,
      () => setLocations([]),
    );

    return () => {
      unsubscribe();
      setLocations([]);
    };
  }, [sessionId]);

  return locations;
}

export function useHidingZonesSync(sessionId: string | undefined) {
  const [zones, setZones] = useState<HidingZoneRecord[]>([]);

  useEffect(() => {
    if (!isRemoteSession(sessionId)) {
      return;
    }

    const unsubscribe = subscribeToHidingZones(
      sessionId,
      setZones,
      () => setZones([]),
    );

    return () => {
      unsubscribe();
      setZones([]);
    };
  }, [sessionId]);

  return zones;
}

export function useSessionMessagesSync(sessionId: string | undefined) {
  const [messages, setMessages] = useState<SessionMessageRecord[]>([]);

  useEffect(() => {
    if (!isRemoteSession(sessionId)) {
      return;
    }

    const unsubscribe = subscribeToSessionMessages(
      sessionId,
      setMessages,
      () => setMessages([]),
    );

    return () => {
      unsubscribe();
      setMessages([]);
    };
  }, [sessionId]);

  return messages;
}

export function usePendingQuestionsSync(sessionId: string | undefined) {
  const [questions, setQuestions] = useState<PendingQuestionRecord[]>([]);

  useEffect(() => {
    if (!isRemoteSession(sessionId)) {
      return;
    }

    const unsubscribe = subscribeToPendingQuestions(
      sessionId,
      setQuestions,
      () => setQuestions([]),
    );

    return () => {
      unsubscribe();
      setQuestions([]);
    };
  }, [sessionId]);

  return questions;
}
